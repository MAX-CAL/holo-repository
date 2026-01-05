import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's JWT for authentication
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const { audio } = await req.json();
    
    if (!audio) {
      return new Response(
        JSON.stringify({ error: 'No audio data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing audio transcription for user:', userId);

    // Convert base64 to ArrayBuffer
    const audioBuffer = base64ToArrayBuffer(audio);
    
    // Create form data for Whisper API via Lovable gateway
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');

    // Send to OpenAI Whisper via Lovable gateway for transcription
    const transcribeResponse = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: formData,
    });

    if (!transcribeResponse.ok) {
      if (transcribeResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (transcribeResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await transcribeResponse.text();
      console.error('Transcription error:', transcribeResponse.status, errorText);
      throw new Error('Failed to transcribe audio');
    }

    const transcribeResult = await transcribeResponse.json();
    const transcribedText = transcribeResult.text;

    console.log('Transcribed text:', transcribedText);

    if (!transcribedText || transcribedText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'No speech detected in recording' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's categories - RLS will filter automatically
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, color')
      .is('parent_id', null);

    if (catError) {
      console.error('Error fetching categories:', catError);
      throw catError;
    }

    const categoryList = categories?.map(c => `- ${c.name} (ID: ${c.id})`).join('\n') || 'No categories exist';

    // Call AI to analyze, clean up, and categorize the transcribed text
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `You are a smart assistant that helps organize voice-transcribed thoughts into categories. 

The user has these categories:
${categoryList}

Your job is to:
1. Clean up the transcribed speech (fix grammar, remove filler words like "um", "uh", "like", "you know")
2. Match it to the most relevant existing category (or suggest creating "General" if none fit)
3. Refine the thought text (expand clarity, make it professional but keep the original meaning)
4. Create a good title for this entry

Respond ONLY with valid JSON in this exact format:
{
  "category_id": "uuid-of-best-matching-category or null if no categories exist",
  "category_name": "name of the category",
  "title": "A concise title for this thought",
  "refined_content": "The refined, polished version of the thought",
  "original_transcription": "The original transcribed text for reference"
}`
          },
          { role: "user", content: transcribedText }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI processing failed');
    }

    const aiResult = await response.json();
    const aiContent = aiResult.choices?.[0]?.message?.content;
    
    console.log('AI response:', aiContent);

    let parsed;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                       aiContent.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, aiContent];
      parsed = JSON.parse(jsonMatch[1] || aiContent);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      throw new Error('Failed to parse AI response');
    }

    let targetCategoryId = parsed.category_id;
    let targetCategoryName = parsed.category_name;

    // If no matching category, create a "General" category
    if (!targetCategoryId && categories && categories.length === 0) {
      const { data: newCat, error: newCatError } = await supabase
        .from('categories')
        .insert({
          user_id: userId,
          name: 'General',
          color: '#6366f1',
          position_x: 2,
          position_y: 0,
          position_z: 0
        })
        .select()
        .single();

      if (newCatError) throw newCatError;
      targetCategoryId = newCat.id;
      targetCategoryName = 'General';
    }

    // If still no category ID but categories exist, use the first one
    if (!targetCategoryId && categories && categories.length > 0) {
      targetCategoryId = categories[0].id;
      targetCategoryName = categories[0].name;
    }

    // We need a subcategory to save entries - create or find one
    const { data: subcats, error: subcatError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('parent_id', targetCategoryId);

    if (subcatError) throw subcatError;

    let targetSubcategoryId;
    let targetSubcategoryName;

    if (subcats && subcats.length > 0) {
      // Use the first subcategory
      targetSubcategoryId = subcats[0].id;
      targetSubcategoryName = subcats[0].name;
    } else {
      // Create a "Voice Notes" subcategory
      const { data: newSubcat, error: newSubcatError } = await supabase
        .from('categories')
        .insert({
          user_id: userId,
          parent_id: targetCategoryId,
          name: 'Voice Notes',
          color: '#ec4899',
          position_x: 2,
          position_y: 0,
          position_z: 0
        })
        .select()
        .single();

      if (newSubcatError) throw newSubcatError;
      targetSubcategoryId = newSubcat.id;
      targetSubcategoryName = 'Voice Notes';
    }

    // Save the entry
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .insert({
        user_id: userId,
        category_id: targetSubcategoryId,
        title: parsed.title,
        content: parsed.refined_content,
        tags: ['voice-note']
      })
      .select()
      .single();

    if (entryError) throw entryError;

    return new Response(
      JSON.stringify({
        success: true,
        entry,
        category_name: targetCategoryName,
        subcategory_name: targetSubcategoryName,
        original_transcription: parsed.original_transcription || transcribedText,
        refined_content: parsed.refined_content
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Voice transcribe error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

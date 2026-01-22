import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      console.error('Auth error:', userError?.message, userError?.status, 'Full error:', JSON.stringify(userError));
      return new Response(
        JSON.stringify({ 
          error: 'Session expired. Please refresh the page and try again.',
          code: 'AUTH_ERROR',
          details: userError?.message
        }),
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

    const audioBuffer = base64ToArrayBuffer(audio);
    
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');

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

    // Fetch ALL categories for the user - RLS will filter automatically
    const { data: allCategories, error: catError } = await supabase
      .from('categories')
      .select('id, name, color, parent_id');

    if (catError) {
      console.error('Error fetching categories:', catError);
      throw catError;
    }

    // Build hierarchy for AI context
    const mainCategories = allCategories?.filter(c => !c.parent_id) || [];
    const subcategories = allCategories?.filter(c => c.parent_id) || [];
    
    let categoryHierarchy = '';
    for (const main of mainCategories) {
      categoryHierarchy += `- ${main.name} (ID: ${main.id})\n`;
      const subs = subcategories.filter(s => s.parent_id === main.id);
      for (const sub of subs) {
        categoryHierarchy += `  └─ ${sub.name} (ID: ${sub.id})\n`;
      }
    }

    if (!categoryHierarchy) {
      categoryHierarchy = 'No categories exist yet';
    }

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

The user has this category hierarchy:
${categoryHierarchy}

IMPORTANT MATCHING RULES:
- Match to the most SPECIFIC subcategory when possible
- If a thought mentions startup/business ideas → match to a Career/Business subcategory
- If a thought mentions travel/places → match to a Travel subcategory
- If a thought mentions music/art/culture → match to a Culture subcategory
- Only suggest "General" if absolutely NO category fits

Your job is to:
1. Clean up the transcribed speech (fix grammar, remove filler words like "um", "uh", "like", "you know")
2. Match it to the most relevant SUBCATEGORY (prefer subcategories over main categories)
3. Refine the thought text (expand clarity, make it professional but keep the original meaning)
4. Create a good title for this entry

Respond ONLY with valid JSON in this exact format:
{
  "category_id": "uuid-of-best-matching-subcategory",
  "category_name": "name of the subcategory",
  "parent_category_name": "name of the parent category or null",
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
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                       aiContent.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, aiContent];
      parsed = JSON.parse(jsonMatch[1] || aiContent);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      throw new Error('Failed to parse AI response');
    }

    // Return processed data WITHOUT saving to database
    return new Response(
      JSON.stringify({
        success: true,
        processed: {
          title: parsed.title,
          content: parsed.refined_content,
          original_transcription: parsed.original_transcription || transcribedText,
          suggested_category_id: parsed.category_id,
          suggested_category_name: parsed.category_name,
          parent_category_name: parsed.parent_category_name
        },
        categories: allCategories
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Error',
      timestamp: new Date().toISOString()
    };
    console.error('Process voice error:', JSON.stringify(errorDetails));
    return new Response(
      JSON.stringify({ 
        error: errorDetails.message,
        code: 'PROCESSING_ERROR',
        details: errorDetails
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

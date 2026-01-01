import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { thought, userId } = await req.json();
    
    if (!thought || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing thought or userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get the Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, color')
      .eq('user_id', userId)
      .is('parent_id', null);

    if (catError) {
      console.error('Error fetching categories:', catError);
      throw catError;
    }

    const categoryList = categories?.map(c => `- ${c.name} (ID: ${c.id})`).join('\n') || 'No categories exist';

    // Call AI to analyze and categorize
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
            content: `You are a smart assistant that helps organize thoughts into categories. 
            
The user has these categories:
${categoryList}

Your job is to:
1. Analyze the user's thought
2. Match it to the most relevant existing category (or suggest creating "General" if none fit)
3. Refine the thought text (fix grammar, expand clarity, make it professional)
4. Create a good title for this entry

Respond ONLY with valid JSON in this exact format:
{
  "category_id": "uuid-of-best-matching-category or null if no categories exist",
  "category_name": "name of the category",
  "title": "A concise title for this thought",
  "refined_content": "The refined, polished version of the thought"
}`
          },
          { role: "user", content: thought }
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
      .eq('user_id', userId)
      .eq('parent_id', targetCategoryId);

    if (subcatError) throw subcatError;

    let targetSubcategoryId;
    let targetSubcategoryName;

    if (subcats && subcats.length > 0) {
      // Use the first subcategory
      targetSubcategoryId = subcats[0].id;
      targetSubcategoryName = subcats[0].name;
    } else {
      // Create a "Quick Notes" subcategory
      const { data: newSubcat, error: newSubcatError } = await supabase
        .from('categories')
        .insert({
          user_id: userId,
          parent_id: targetCategoryId,
          name: 'Quick Notes',
          color: '#8b5cf6',
          position_x: 2,
          position_y: 0,
          position_z: 0
        })
        .select()
        .single();

      if (newSubcatError) throw newSubcatError;
      targetSubcategoryId = newSubcat.id;
      targetSubcategoryName = 'Quick Notes';
    }

    // Save the entry
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .insert({
        user_id: userId,
        category_id: targetSubcategoryId,
        title: parsed.title,
        content: parsed.refined_content,
        tags: []
      })
      .select()
      .single();

    if (entryError) throw entryError;

    return new Response(
      JSON.stringify({
        success: true,
        entry,
        category_name: targetCategoryName,
        subcategory_name: targetSubcategoryName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Quick capture error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

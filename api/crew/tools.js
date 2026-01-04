const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'tool_generate_social_posts',
      description: 'Generate social media post ideas for a campaign.',
      parameters: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'Platform name (e.g., Instagram, X, LinkedIn)' },
          campaign: { type: 'string', description: 'Campaign or launch focus' },
          count: { type: 'number', description: 'Number of posts' }
        },
        required: ['platform', 'campaign', 'count']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'tool_generate_content_calendar',
      description: 'Generate a weekly content calendar outline.',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          weeks: { type: 'number', description: 'Number of weeks' },
          cadence: { type: 'string', description: 'Cadence (e.g., 3x per week)' }
        },
        required: ['start_date', 'weeks', 'cadence']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'tool_generate_newsletter',
      description: 'Generate a newsletter outline with subject and sections.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Newsletter topic' },
          audience_segment: { type: 'string', description: 'Target audience segment' }
        },
        required: ['topic', 'audience_segment']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'tool_generate_blog_outline',
      description: 'Generate a blog outline optimized for SEO.',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: 'Primary keyword' },
          intent: { type: 'string', description: 'Search intent' }
        },
        required: ['keyword', 'intent']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'tool_generate_outreach_email',
      description: 'Generate an outreach email for a prospect type.',
      parameters: {
        type: 'object',
        properties: {
          prospect_type: { type: 'string', description: 'Prospect persona' },
          offer: { type: 'string', description: 'Offer or value prop' }
        },
        required: ['prospect_type', 'offer']
      }
    }
  }
];

function toolGenerateSocialPosts({ platform, campaign, count }) {
  const posts = Array.from({ length: Number(count) || 1 }).map((_, index) => ({
    id: index + 1,
    platform,
    hook: `${campaign}: spotlight moment ${index + 1}`,
    caption: `Bring the ${campaign} energy to ${platform} with a quick story, a bold hook, and a clear CTA.`,
    hashtags: ['#AriyoAI', '#NaijaTech', '#CreativeAI']
  }));

  return { platform, campaign, count: posts.length, posts };
}

function toolGenerateContentCalendar({ start_date, weeks, cadence }) {
  const weekCount = Number(weeks) || 1;
  const calendar = Array.from({ length: weekCount }).map((_, index) => ({
    week: index + 1,
    focus: `Week ${index + 1} spotlight`,
    cadence,
    themes: ['Brand story', 'Product highlight', 'Community moment']
  }));

  return { start_date, weeks: weekCount, cadence, calendar };
}

function toolGenerateNewsletter({ topic, audience_segment }) {
  return {
    subject: `${topic}: the Ariyo AI pulse`,
    preview: `Highlights and insights for ${audience_segment}.`,
    sections: [
      { title: 'Opening note', summary: 'Warm intro that anchors the brand voice.' },
      { title: 'Feature spotlight', summary: `Key update on ${topic}.` },
      { title: 'Action steps', summary: 'CTA links and next actions.' }
    ]
  };
}

function toolGenerateBlogOutline({ keyword, intent }) {
  return {
    keyword,
    intent,
    outline: [
      'Intro: why this topic matters now',
      'Section 1: key benefits and outcomes',
      'Section 2: how Ariyo AI delivers value',
      'Section 3: proof points and examples',
      'Conclusion: CTA and next steps'
    ]
  };
}

function toolGenerateOutreachEmail({ prospect_type, offer }) {
  return {
    subject: `Quick idea for ${prospect_type}`,
    body: `Hi ${prospect_type},\n\nWe can help with ${offer} using Ariyo AI + ETL-GIS Consulting workflows. Interested in a short walkthrough?\n\nBest,\nAriyo AI Crew`
  };
}

const TOOL_RUNNERS = {
  tool_generate_social_posts: toolGenerateSocialPosts,
  tool_generate_content_calendar: toolGenerateContentCalendar,
  tool_generate_newsletter: toolGenerateNewsletter,
  tool_generate_blog_outline: toolGenerateBlogOutline,
  tool_generate_outreach_email: toolGenerateOutreachEmail
};

function runTool(name, args) {
  const runner = TOOL_RUNNERS[name];
  if (!runner) {
    return { error: `Unknown tool: ${name}` };
  }
  return runner(args || {});
}

module.exports = {
  TOOL_DEFINITIONS,
  runTool
};

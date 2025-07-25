export interface Env {
  C_IT_KV: KVNamespace;
  C_IT_BUCKET: R2Bucket;
  ENVIRONMENT: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    try {
      // API routes
      if (path.startsWith('/api/')) {
        return await handleApiRequest(request, env, path);
      }

      // Serve static assets
      if (path.startsWith('/assets/')) {
        return await serveStaticAsset(request, env, path);
      }

      // Default response
      return new Response(JSON.stringify({
        message: 'C-It Algorithm Visualizer API',
        version: '1.0.0',
        endpoints: {
          algorithms: '/api/algorithms',
          visualize: '/api/visualize',
          save: '/api/save',
          load: '/api/load',
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });

    } catch (error) {
      console.error('Error handling request:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
  },
};

async function handleApiRequest(request: Request, env: Env, path: string): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  switch (path) {
    case '/api/algorithms':
      return await getAlgorithms(request, env, corsHeaders);
    
    case '/api/visualize':
      return await visualizeAlgorithm(request, env, corsHeaders);
    
    case '/api/save':
      return await saveVisualization(request, env, corsHeaders);
    
    case '/api/load':
      return await loadVisualization(request, env, corsHeaders);
    
    default:
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
  }
}

async function getAlgorithms(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  // Return list of available algorithms
  const algorithms = [
    {
      id: 'bubble-sort',
      name: 'Bubble Sort',
      category: 'sorting',
      description: 'A simple sorting algorithm',
      timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
      spaceComplexity: 'O(1)',
    },
    {
      id: 'quick-sort',
      name: 'Quick Sort',
      category: 'sorting',
      description: 'A highly efficient sorting algorithm',
      timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
      spaceComplexity: 'O(log n)',
    },
    {
      id: 'merge-sort',
      name: 'Merge Sort',
      category: 'sorting',
      description: 'A stable sorting algorithm',
      timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
      spaceComplexity: 'O(n)',
    },
    {
      id: 'linear-search',
      name: 'Linear Search',
      category: 'searching',
      description: 'A simple search algorithm',
      timeComplexity: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' },
      spaceComplexity: 'O(1)',
    },
    {
      id: 'binary-search',
      name: 'Binary Search',
      category: 'searching',
      description: 'An efficient search algorithm',
      timeComplexity: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)' },
      spaceComplexity: 'O(1)',
    },
  ];

  return new Response(JSON.stringify({ algorithms }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

async function visualizeAlgorithm(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  try {
    const body = await request.json();
    const { algorithmId, inputArray } = body;

    if (!algorithmId || !inputArray) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // Generate visualization steps based on algorithm
    const steps = generateVisualizationSteps(algorithmId, inputArray);

    return new Response(JSON.stringify({ steps }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}

async function saveVisualization(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  try {
    const body = await request.json();
    const { name, algorithmId, inputArray, steps } = body;

    if (!name || !algorithmId || !inputArray || !steps) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    const id = crypto.randomUUID();
    const timestamp = Date.now();

    const visualization = {
      id,
      name,
      algorithmId,
      inputArray,
      steps,
      timestamp,
    };

    // Save to KV
    await env.C_IT_KV.put(`visualization:${id}`, JSON.stringify(visualization));

    return new Response(JSON.stringify({ id, success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to save visualization' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}

async function loadVisualization(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing visualization ID' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  try {
    const visualization = await env.C_IT_KV.get(`visualization:${id}`);

    if (!visualization) {
      return new Response(JSON.stringify({ error: 'Visualization not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    return new Response(visualization, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to load visualization' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}

async function serveStaticAsset(request: Request, env: Env, path: string): Promise<Response> {
  try {
    const key = path.replace('/assets/', '');
    const object = await env.C_IT_BUCKET.get(key);

    if (!object) {
      return new Response('Asset not found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    return new Response(object.body, {
      headers,
    });

  } catch (error) {
    return new Response('Error serving asset', { status: 500 });
  }
}

function generateVisualizationSteps(algorithmId: string, inputArray: number[]): any[] {
  // This is a simplified version - in a real implementation, you'd have more sophisticated logic
  const steps = [];
  const array = [...inputArray];

  switch (algorithmId) {
    case 'bubble-sort':
      for (let i = 0; i < array.length - 1; i++) {
        for (let j = 0; j < array.length - i - 1; j++) {
          steps.push({
            type: 'compare',
            indices: [j, j + 1],
            description: `Comparing elements at positions ${j} and ${j + 1}`,
            array: [...array],
          });

          if (array[j] > array[j + 1]) {
            [array[j], array[j + 1]] = [array[j + 1], array[j]];
            steps.push({
              type: 'swap',
              indices: [j, j + 1],
              description: `Swapping elements at positions ${j} and ${j + 1}`,
              array: [...array],
            });
          }
        }
      }
      break;

    case 'quick-sort':
      // Simplified quick sort visualization
      steps.push({
        type: 'highlight',
        indices: [array.length - 1],
        description: 'Selecting pivot element',
        array: [...array],
      });
      break;

    default:
      steps.push({
        type: 'highlight',
        indices: [0],
        description: 'Algorithm visualization not implemented yet',
        array: [...array],
      });
  }

  return steps;
} 
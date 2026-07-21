// ==========================================================================
// Nexus IDE — Registro/motor de proveedores de IA (módulo separado de app.js)
// Datos (AI_MODELS_FULL, registros OpenAI-compat y locales) + resolvers puros
// (getProviderForModel, getRealModelId, getModelForProvider, localUrlKey,
//  localModelKey). NO incluye apiKeysState/getApiKeyForModel/sendRequestToAI
//  (esos se quedan en app.js porque usan apiKeysState, que es scope de script).
// Se carga en index.html ANTES de app.js (la IIFE de modelList lee
//  window.AI_MODELS_FULL en carga).
// ==========================================================================
        function getModelForProvider(provider) {
            const found = AI_MODELS_FULL.find(m => m.provider === provider);
            return found ? found.id : 'gemini-3.5-flash';
        }
        // LISTADO ENRIQUECIDO DE MODELOS DE IA 2025 (AI_MODELS_FULL)
        const AI_MODELS_FULL = [
            // Google AI
            { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", provider: "google", context: "2M", speed: "Ultrarrápido", description: "Modelo insignia de Google de última generación, rápido y de ventana masiva" },
            { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", provider: "google", context: "2M", speed: "Moderado", description: "Modelo insignia para razonamiento complejo y codificación avanzada" },
            { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", provider: "google", context: "4M", speed: "Ultrarrápido", description: "Modelo optimizado y ligero con ventana de 4M de tokens" },
            { id: "gemini-3-flash", name: "Gemini 3 Flash", provider: "google", context: "2M", speed: "Ultrarrápido", description: "Modelo de texto de salida rápido y altamente eficiente" },
            { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google", context: "2M", speed: "Moderado", description: "Modelo de alto razonamiento de la serie 2.5" },
            { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google", context: "1M", speed: "Ultrarrápido", description: "Modelo equilibrado en costo y latencia con ventana de 1M" },
            { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", provider: "google", context: "4M", speed: "Ultrarrápido", description: "Modelo optimizado y eficiente con gran ventana de contexto" },
            { id: "gemini-2-flash", name: "Gemini 2 Flash", provider: "google", context: "4M", speed: "Ultrarrápido", description: "Modelo ultra-rápido de la serie Gemini 2 con ventana de 4M" },
            { id: "gemini-2-flash-lite", name: "Gemini 2-flash-lite", provider: "google", context: "4M", speed: "Ultrarrápido", description: "Versión ligera de Gemini 2 optimizada para respuestas inmediatas" },

            // Anthropic
            { id: "claude-opus-4-7", name: "Claude 4.7 Opus", provider: "anthropic", context: "1M", speed: "Moderado", description: "Flagship actual, salto generacional en programación autónoma y visión optimizada" },
            { id: "claude-opus-4-6", name: "Claude 4.6 Opus", provider: "anthropic", context: "1M", speed: "Moderado", description: "Especializado en la orquestación de equipos de agentes multivariable" },
            { id: "claude-sonnet-5", name: "Claude 5 Sonnet (Fennec)", provider: "anthropic", context: "1M", speed: "Rápido", description: "Introduce el modo Dev Team para colaboración multiagente nativa" },
            { id: "claude-sonnet-4-6", name: "Claude 4.6 Sonnet", provider: "anthropic", context: "1M", speed: "Rápido", description: "Opción preferida para producción con rendimiento Opus a costo económico" },
            { id: "claude-haiku-4-5", name: "Claude 4.5 Haiku", provider: "anthropic", context: "200k", speed: "Ultrarrápido", description: "Alta velocidad y baja latencia para smart switching y tareas sencillas" },

            // OpenAI
            { id: "gpt-5.5", name: "GPT-5.5", provider: "openai", context: "1M", speed: "Rápido", description: "Modelo insignia optimizado para razonamiento complejo, código y uso de computadoras" },
            { id: "gpt-5.4", name: "GPT-5.4", provider: "openai", context: "1M", speed: "Rápido", description: "Altamente capaz y más asequible para tareas profesionales y programación" },
            { id: "gpt-5.4-mini", name: "GPT-5.4 Mini", provider: "openai", context: "1M", speed: "Ultrarrápido", description: "La opción 'mini' más fuerte para agentes autónomos y codificación" },
            { id: "gpt-5.4-nano", name: "GPT-5.4 Nano", provider: "openai", context: "1M", speed: "Ultrarrápido", description: "Modelo rápido y sumamente económico para resúmenes y clasificación" },

            // Groq
            { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Llama-70B", provider: "groq", context: "128k", speed: "Ultrarrápido", description: "Modelo R1 destilado a Llama 70B corriendo a velocidad extrema en Groq" },
            { id: "groq/compound", name: "Groq Compound", provider: "groq", context: "128k", speed: "Ultrarrápido", description: "Modelo nativo de Groq optimizado para agentes y flujos multitarea" },
            { id: "groq/compound-mini", name: "Groq Compound Mini", provider: "groq", context: "128k", speed: "Ultrarrápido", description: "Versión compacta optimizada para navegación web y ejecución ágil" },

            // Mistral
            { id: "mistral-large-2512", name: "Mistral Large 3", provider: "mistral", context: "256k", speed: "Rápido", description: "Modelo MoE de 675B insignia para agentes lógicos complejos" },
            { id: "mistral-medium-3.5", name: "Mistral Medium 3.5", provider: "mistral", context: "128k", speed: "Rápido", description: "Optimizado específicamente para flujos de programación asistida" },
            { id: "ministral-8b", name: "Ministral 8B", provider: "mistral", context: "32k", speed: "Ultrarrápido", description: "Modelo compacto ideal para robótica y latencia extremadamente baja" },
            { id: "devstral-2", name: "Devstral 2", provider: "mistral", context: "64k", speed: "Ultrarrápido", description: "Líder en tareas de ingeniería de software y agentes autónomos" },

            // DeepSeek
            { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", provider: "deepseek", context: "1M", speed: "Moderado", description: "Modelo MoE de 1.6T de parámetros, líder en codificación autónoma y razonamiento" },
            { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", provider: "deepseek", context: "1M", speed: "Ultrarrápido", description: "Baja latencia y altísima eficiencia con la misma ventana de contexto" },

            // Moonshot
            { id: "kimi-k2.6", name: "Kimi K2.6", provider: "moonshot", context: "1M", speed: "Moderado", description: "Modelo MoE de 1T de parámetros para Long-Horizon Coding y enjambres de agentes" },

            // xAI
            { id: "grok-4.3", name: "Grok 4.3", provider: "xai", context: "1M", speed: "Rápido", description: "Modelo insignia con razonamiento configurable y análisis multimodal" },
            { id: "grok-build-0.1", name: "Grok Build 0.1", provider: "xai", context: "1M", speed: "Rápido", description: "Especializado para desarrollo web y flujos puramente lógicos de código" },

            // OpenRouter
            { id: "openrouter/qwen/qwen-2.5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B (OpenRouter)", provider: "openrouter", context: "128k", speed: "Rápido", description: "Modelo Qwen líder en codificación vía OpenRouter" },
            { id: "openrouter/qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B (OpenRouter)", provider: "openrouter", context: "128k", speed: "Moderado", description: "Modelo Qwen insignia de gran tamaño" },
            { id: "openrouter/deepseek/deepseek-chat", name: "DeepSeek V3 (OpenRouter)", provider: "openrouter", context: "64k", speed: "Rápido", description: "DeepSeek V3 consumido vía OpenRouter" },

            // Ollama
            { id: "ollama/qwen2.5-coder:7b", name: "Qwen 2.5 Coder 7B (Ollama Local)", provider: "ollama", context: "32k", speed: "Rápido", description: "Qwen Coder ejecutándose en tu máquina local" },
            { id: "ollama/qwen2.5-coder:1.5b", name: "Qwen 2.5 Coder 1.5B (Ollama Local)", provider: "ollama", context: "32k", speed: "Ultrarrápido", description: "Modelo ultra-ligero para autocompletado en local" },
            { id: "ollama/gemma2:2b", name: "Gemma 2 2B (Ollama Local - Google)", provider: "ollama", context: "8k", speed: "Ultrarrápido", description: "Modelo ultra-rápido de Google Gemma 2, optimizado para CPUs y baja latencia" },
            { id: "ollama/gemma2:9b", name: "Gemma 2 9B (Ollama Local - Google)", provider: "ollama", context: "8k", speed: "Rápido", description: "Gemma 2 de Google balanceado para razonamiento general y código" },
            { id: "ollama/gemma2:27b", name: "Gemma 2 27B (Ollama Local - Google)", provider: "ollama", context: "8k", speed: "Moderado", description: "Gemma 2 de alta precisión para tareas complejas en GPU local" },
            { id: "ollama/gemma4", name: "Gemma 4 (Ollama Local - Google)", provider: "ollama", context: "16k", speed: "Rápido", description: "Opción de próxima generación local de Google Gemma" },
            { id: "ollama/gemma:2b", name: "Gemma 2B (Ollama Local - Google)", provider: "ollama", context: "8k", speed: "Ultrarrápido", description: "Google Gemma original de 2B de parámetros" },
            { id: "ollama/gemma:7b", name: "Gemma 7B (Ollama Local - Google)", provider: "ollama", context: "8k", speed: "Rápido", description: "Google Gemma original de 7B de parámetros" },
            { id: "ollama/codegemma:7b", name: "CodeGemma 7B (Ollama Local - Google)", provider: "ollama", context: "8k", speed: "Rápido", description: "Google CodeGemma especializado para tareas de codificación" },
            { id: "ollama/custom", name: "Ollama Customizado", provider: "ollama", context: "Variable", speed: "Variable", description: "Cualquier modelo local configurado en Ollama" },

            // Together AI (nube)
            { id: "together/meta-llama/Llama-3.3-70B-Instruct-Turbo", name: "Llama 3.3 70B Turbo (Together)", provider: "together", context: "128k", speed: "Rápido", description: "Llama 3.3 70B servido a alta velocidad en Together AI" },
            { id: "together/Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen 2.5 Coder 32B (Together)", provider: "together", context: "128k", speed: "Rápido", description: "Modelo líder en codificación vía Together AI" },
            { id: "together/deepseek-ai/DeepSeek-V3", name: "DeepSeek V3 (Together)", provider: "together", context: "128k", speed: "Moderado", description: "DeepSeek V3 servido en Together AI" },

            // Perplexity (nube, con búsqueda web)
            { id: "perplexity/sonar", name: "Sonar (Perplexity)", provider: "perplexity", context: "128k", speed: "Rápido", description: "Modelo con acceso a búsqueda web en tiempo real" },
            { id: "perplexity/sonar-pro", name: "Sonar Pro (Perplexity)", provider: "perplexity", context: "200k", speed: "Moderado", description: "Búsqueda web avanzada y respuestas con citas" },
            { id: "perplexity/sonar-reasoning", name: "Sonar Reasoning (Perplexity)", provider: "perplexity", context: "128k", speed: "Moderado", description: "Razonamiento en cadena con búsqueda web integrada" },

            // Fireworks AI (nube)
            { id: "fireworks/accounts/fireworks/models/llama-v3p3-70b-instruct", name: "Llama 3.3 70B (Fireworks)", provider: "fireworks", context: "128k", speed: "Rápido", description: "Llama 3.3 70B servido en Fireworks AI" },
            { id: "fireworks/accounts/fireworks/models/qwen2p5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B (Fireworks)", provider: "fireworks", context: "128k", speed: "Rápido", description: "Qwen Coder para programación vía Fireworks" },

            // Cerebras (nube, inferencia ultrarrápida)
            { id: "cerebras/llama-3.3-70b", name: "Llama 3.3 70B (Cerebras)", provider: "cerebras", context: "128k", speed: "Ultrarrápido", description: "Llama 3.3 70B a velocidad extrema en hardware Cerebras" },
            { id: "cerebras/qwen-3-32b", name: "Qwen 3 32B (Cerebras)", provider: "cerebras", context: "128k", speed: "Ultrarrápido", description: "Qwen 3 32B con inferencia ultrarrápida en Cerebras" },

            // LM Studio (local)
            { id: "lmstudio/custom", name: "LM Studio (Local)", provider: "lmstudio", context: "Variable", speed: "Variable", description: "Modelo cargado en LM Studio (servidor local en :1234)" },

            // Jan (local)
            { id: "jan/custom", name: "Jan (Local)", provider: "jan", context: "Variable", speed: "Variable", description: "Modelo cargado en Jan (servidor local en :1337)" },

            // llama.cpp server (local)
            { id: "llamacpp/custom", name: "llama.cpp (Local)", provider: "llamacpp", context: "Variable", speed: "Variable", description: "Modelo servido por llama-server de llama.cpp (:8080)" },

            // vLLM (local / self-host)
            { id: "vllm/custom", name: "vLLM (Local)", provider: "vllm", context: "Variable", speed: "Variable", description: "Modelo servido por vLLM (OpenAI-compat en :8000)" }
        ];
        // ==========================================================================
        // REGISTRO DE PROVEEDORES DE IA
        // OpenAI-compat: usan el mismo formato /chat/completions (fácil de extender).
        // Locales: se ejecutan en tu máquina, con URL configurable y sin clave.
        // ==========================================================================
        const LOCAL_AI_PROVIDERS = new Set(['ollama', 'lmstudio', 'jan', 'llamacpp', 'vllm']);
        const OPENAI_COMPAT_PROVIDERS = new Set([
            'openai', 'groq', 'openrouter', 'mistral', 'deepseek', 'moonshot', 'xai',
            'together', 'perplexity', 'fireworks', 'cerebras',            // nube (nuevos)
            'ollama', 'lmstudio', 'jan', 'llamacpp', 'vllm'               // locales
        ]);
        // URLs de los proveedores en la nube compatibles con OpenAI.
        const CLOUD_OPENAI_URLS = {
            openai:     'https://api.openai.com/v1/chat/completions',
            groq:       'https://api.groq.com/openai/v1/chat/completions',
            openrouter: 'https://openrouter.ai/api/v1/chat/completions',
            mistral:    'https://api.mistral.ai/v1/chat/completions',
            deepseek:   'https://api.deepseek.com/v1/chat/completions',
            moonshot:   'https://api.moonshot.cn/v1/chat/completions',
            xai:        'https://api.x.ai/v1/chat/completions',
            together:   'https://api.together.xyz/v1/chat/completions',
            perplexity: 'https://api.perplexity.ai/chat/completions',
            fireworks:  'https://api.fireworks.ai/inference/v1/chat/completions',
            cerebras:   'https://api.cerebras.ai/v1/chat/completions'
        };
        // URL local por defecto de cada servidor (configurable en nexus_<id>_url).
        const LOCAL_AI_DEFAULT_URLS = {
            ollama:   'http://127.0.0.1:11434',
            lmstudio: 'http://127.0.0.1:1234',
            jan:      'http://127.0.0.1:1337',
            llamacpp: 'http://127.0.0.1:8080',
            vllm:     'http://127.0.0.1:8000'
        };
        // Modelo local por defecto de cada servidor (configurable en nexus_<id>_model).
        const LOCAL_AI_DEFAULT_MODELS = {
            ollama:   'qwen2.5-coder:7b',
            lmstudio: 'local-model',
            jan:      'llama3.2:3b',
            llamacpp: 'default',
            vllm:     'default'
        };
        // Claves de localStorage para URL/modelo de cada proveedor local.
        // (Ollama mantiene su clave histórica 'nexus_ollama_custom_model' por compatibilidad.)
        function localUrlKey(p) { return 'nexus_' + p + '_url'; }
        function localModelKey(p) { return p === 'ollama' ? 'nexus_ollama_custom_model' : ('nexus_' + p + '_model'); }
        function getProviderForModel(modelId) {
            const found = AI_MODELS_FULL.find(m => m.id === modelId);
            if (found) return found.provider;

            if (modelId.startsWith('gemini-')) return 'google';
            if (modelId.startsWith('claude-')) return 'anthropic';
            if (modelId.startsWith('gpt-') || modelId.startsWith('o3-') || modelId.startsWith('o1-')) return 'openai';
            if (modelId.startsWith('llama-') || modelId.startsWith('deepseek-r1-distill-')) return 'groq';
            if (modelId.startsWith('mistral-') || modelId.startsWith('open-mistral-') || modelId.startsWith('codestral-')) return 'mistral';
            if (modelId.startsWith('deepseek-')) return 'deepseek';
            if (modelId.startsWith('moonshot-') || modelId.startsWith('kimi-')) return 'moonshot';
            if (modelId.startsWith('grok-')) return 'xai';
            // Proveedores con prefijo explícito "<provider>/modelo".
            for (const p of ['openrouter', 'ollama', 'together', 'perplexity', 'fireworks', 'cerebras', 'lmstudio', 'jan', 'llamacpp', 'vllm']) {
                if (modelId.startsWith(p + '/')) return p;
            }
            return null;
        }
        function getRealModelId(modelId, provider) {
            if (provider === 'google') {
                if (modelId.startsWith('gemini-3.5') || modelId.startsWith('gemini-3.') || modelId.startsWith('gemini-3')) {
                    return 'gemini-1.5-flash';
                }
                if (modelId.startsWith('gemini-2.5-pro')) {
                    return 'gemini-1.5-pro';
                }
                if (modelId.startsWith('gemini-2.5-flash') || modelId.startsWith('gemini-2-flash')) {
                    return 'gemini-1.5-flash';
                }
                return modelId;
            }
            if (provider === 'openai') {
                if (modelId.startsWith('gpt-5.5') || modelId.startsWith('gpt-5.4')) {
                    if (modelId.includes('mini') || modelId.includes('nano')) {
                        return 'gpt-4o-mini';
                    }
                    return 'gpt-4o';
                }
                return modelId;
            }
            if (provider === 'anthropic') {
                if (modelId.startsWith('claude-opus')) {
                    return 'claude-3-opus-20240229';
                }
                if (modelId.startsWith('claude-sonnet')) {
                    return 'claude-3-5-sonnet-20241022';
                }
                if (modelId.startsWith('claude-haiku')) {
                    return 'claude-3-5-haiku-20241022';
                }
                return modelId;
            }
            if (provider === 'deepseek') {
                if (modelId.startsWith('deepseek-v4')) {
                    return 'deepseek-chat';
                }
                return modelId;
            }
            if (provider === 'groq') {
                if (modelId === 'groq/compound') {
                    return 'llama-3.3-70b-versatile';
                }
                if (modelId === 'groq/compound-mini') {
                    return 'llama-3.1-8b-instant';
                }
                return modelId;
            }
            if (provider === 'mistral') {
                if (modelId.startsWith('mistral-large')) {
                    return 'mistral-large-latest';
                }
                if (modelId.startsWith('mistral-medium')) {
                    return 'mistral-medium-latest';
                }
                if (modelId.startsWith('ministral-8b')) {
                    return 'ministral-8b-latest';
                }
                if (modelId.startsWith('devstral-2')) {
                    return 'codestral-latest';
                }
                return modelId;
            }
            if (provider === 'xai') {
                if (modelId.startsWith('grok-')) {
                    return 'grok-2-1212';
                }
                return modelId;
            }
            return modelId;
        }

        // --- Exposición global para app.js (que se carga después) ---
        window.AI_MODELS_FULL          = AI_MODELS_FULL;
        window.LOCAL_AI_PROVIDERS      = LOCAL_AI_PROVIDERS;
        window.OPENAI_COMPAT_PROVIDERS = OPENAI_COMPAT_PROVIDERS;
        window.CLOUD_OPENAI_URLS       = CLOUD_OPENAI_URLS;
        window.LOCAL_AI_DEFAULT_URLS   = LOCAL_AI_DEFAULT_URLS;
        window.LOCAL_AI_DEFAULT_MODELS = LOCAL_AI_DEFAULT_MODELS;

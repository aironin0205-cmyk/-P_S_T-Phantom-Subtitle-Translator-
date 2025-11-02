// ===== DEVELOPMENT/DEBUG GEMINI AGENT SERVICE =====
// This service abstracts all interactions with the Google Gemini API.
// It is responsible for prompt engineering and parsing structured responses.
// This is the COMPLETE file with all prompts included.

// ===== IMPORTS & DEPENDENCIES =====
import { toSrtPromptFormat } from '../core/srtParser.js';
import { config } from '../config/index.js';
import { callGemini } from '../config/gemini.js'; // We will create this client initialization file later.
import { ApiError } from '../core/AppError.js';

// ===== UTILITY FUNCTIONS =====
/**
 * Parses a JSON response from an agent, cleaning up common LLM artifacts.
 * @param {string} responseText - The raw text response from the Gemini API.
 * @param {string} agentName - The name of the agent for error logging.
 * @returns {object} The parsed JSON object.
 * @throws {ApiError} If the JSON is invalid.
 */
function parseJsonAgentResponse(responseText, agentName) {
  try {
    const cleanedText = responseText.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(cleanedText);
  } catch (error) {
    throw new ApiError(`Agent [${agentName}] returned malformed JSON.`, 500, 'AGENT_JSON_ERROR', { responseText });
  }
}

// ===== AGENT SERVICE CLASS =====
export class GeminiAgentService {
  constructor({ logger }) {
    this.logger = logger;
  }

  // --- BLUEPRINT GENERATION AGENTS (PHASE 1) ---

  async extractKeywords(text) {
    this.logger.info('Agent [extractKeywords] activated.');
    const prompt = `You are a Lexical Analyst. Your only task is to extract technical terms, specialist jargon, named entities, and culturally specific idioms from the text.
Your output MUST be a single JSON object with this exact structure: { "keywords": [{ "term": "...", "definition": "A concise, context-relevant definition" }] }.
Do not output any text before or after the JSON object. If no keywords are found, return { "keywords": [] }.

---
**Source Text for Analysis:**
${text}
---

Produce the JSON output.`;
    const response = await callGemini(prompt, { modelName: config.GEMINI_BLUEPRINT_MODEL, expectJson: true });
    return parseJsonAgentResponse(response, 'extractKeywords');
  }

  async groundTranslations(keywords) {
    this.logger.info({ keywordCount: keywords.length }, 'Agent [groundTranslations] activated.');
    const prompt = `You are a professional Lexicographer. For each English term provided, find at least 3 high-quality, distinct Persian translations.
Your output MUST be a single JSON object with this exact structure: { "grounded_keywords": [{ "term": "...", "translations": ["...", "..."] }] }.
Do not output any text before or after the JSON object.

---
**Terms to Translate (with definitions):**
${JSON.stringify(keywords, null, 2)}
---

Produce the JSON output.`;
    const response = await callGemini(prompt, { modelName: config.GEMINI_BLUEPRINT_MODEL, expectJson: true });
    return parseJsonAgentResponse(response, 'groundTranslations');
  }

  async assembleBlueprint(text, tone, groundedKeywords) {
    this.logger.info('Agent [assembleBlueprint] activated.');
    const prompt = `You are a Pre-production Strategist. Generate a "Translation Blueprint" JSON object based on the provided script, tone, and pre-verified keywords. This blueprint is the single source of truth for the translation team. Your analysis must be meticulous.
The JSON MUST include:
1.  'summary': A concise plot summary.
2.  'keyPoints': An array of key themes.
3.  'characterProfiles': An array of objects detailing character speaking styles.
4.  'culturalAdaptations' (Phantom Lingo™): An array identifying idioms and proposing culturally equivalent Persian adaptations.
5.  'glossary' (World Anvil): A detailed glossary where for each keyword, you select the single best 'proposedTranslation' from the candidates provided, and write a powerful 'justification' based on evidence from the text and the requested '${tone}' tone.

Your output MUST be only the single, valid JSON object. No other text.

---
**PRE-VERIFIED KEYWORD LIST (with translation candidates):**
${JSON.stringify(groundedKeywords, null, 2)}
---
**Full English Subtitle Script for Analysis:**
${text}
---

Produce the complete Translation Blueprint JSON.`;
    const response = await callGemini(prompt, { modelName: config.GEMINI_BLUEPRINT_MODEL, expectJson: true });
    return parseJsonAgentResponse(response, 'assembleBlueprint');
  }

  // --- BATCH TRANSLATION AGENTS (PHASE 2) ---
  
  async _callBatchAgent(agentName, prompt, batch, modelName) {
    this.logger.info({ batchSize: batch.length }, `Agent [${agentName}] activated.`);
    const responseText = await callGemini(prompt, { modelName, expectJson: true });
    const parsed = parseJsonAgentResponse(responseText, agentName);

    if (!Array.isArray(parsed.translations) || parsed.translations.length !== batch.length) {
      this.logger.error({ 
        expected: batch.length, 
        received: parsed.translations?.length, 
        agent: agentName 
      }, "FATAL BATCH MISMATCH: Agent returned a different number of lines than expected.");
      throw new ApiError(`Agent [${agentName}] returned a mismatched number of translations.`, 500, 'AGENT_LENGTH_MISMATCH');
    }
    return parsed.translations;
  }

  async transcreateBatch(batch, blueprint, tone) {
    const batchSrt = toSrtPromptFormat(batch);
    const prompt = `You are a Master Transcreator. Adhering strictly to the provided Blueprint, transcreate the following SRT batch into fluent Persian.
Your output MUST be a single JSON object with this exact structure: { "translations": ["...", "..."] }. The number of strings in the array must exactly match the number of input entries.
Previous Context: [No previous context for this batch]
Blueprint: ${JSON.stringify(blueprint)}
Tone: ${tone}

BATCH TO TRANSLATE (Format: "Sequence | Text"):
---
${batchSrt}
---
Produce the JSON output.`;
    return await this._callBatchAgent('transcreateBatch', prompt, batch, config.GEMINI_TRANSLATION_MODEL);
  }

  async editBatch(batch, initialTranslations, blueprint) {
    const batchSrt = toSrtPromptFormat(batch);
    const prompt = `You are a Senior Editor. Polish the provided Persian translation, ensuring it is faithful to the original English and the Blueprint directives (Glossary, Personas, Tone).
Your output MUST be a single JSON object with this exact structure: { "translations": ["...", "..."] }. The number of strings in the array must exactly match the number of input entries.

ORIGINAL BATCH:
---
${batchSrt}
---
INITIAL TRANSLATION (to be edited):
---
${initialTranslations.join('\n')}
---
Blueprint: ${JSON.stringify(blueprint)}
---
Produce the JSON output.`;
    return await this._callBatchAgent('editBatch', prompt, batch, config.GEMINI_TRANSLATION_MODEL);
  }

  async qaBatch(batch, editedTranslations, blueprint) {
    const batchSrt = toSrtPromptFormat(batch);
    const prompt = `You are Head of QA. Perform a final review of the edited translation for accuracy and brief compliance.
Your output MUST be a single JSON object with this exact structure: { "translations": ["...", "..."] }. The number of strings in the array must exactly match the number of input entries.

ORIGINAL BATCH:
---
${batchSrt}
---
EDITED TRANSLATION (to be reviewed):
---
${editedTranslations.join('\n')}
---
Blueprint: ${JSON.stringify(blueprint)}
---
Produce the JSON output.`;
    return await this._callBatchAgent('qaBatch', prompt, batch, config.GEMINI_TRANSLATION_MODEL);
  }

  async phantomSync(batch, qaTranslations) {
    const promptData = batch.map((line, index) => {
      const translatedLine = qaTranslations[index] || '';
      return `L${line.sequence}:
- Duration: ${line.duration.toFixed(2)}s
- Translated Persian: "${translatedLine}"`;
    }).join('\n');

    const prompt = `You are "Phantom Sync™", a subtitle Pacing & Readability Analyst. Adjust translated Persian lines that are too long for their on-screen duration by rewriting them to be more concise while preserving 100% of the original meaning.
**Rules:**
1.  Analyze each line's reading pace (Characters Per Second). The professional threshold for Persian is ~22 CPS.
2.  If a line is too fast (> 22 CPS), rewrite it to be shorter. Append the annotation: \`[PS Sync: Compressed from "original longer translation" for readability.]\`.
3.  If a line's pace is acceptable, return it exactly as is.
4.  Your output MUST be a single JSON object with this exact structure: { "translations": ["...", "..."] }. The number of strings in the array must exactly match the number of input lines.

**Data for Analysis:**
---
${promptData}
---
Produce the JSON output containing the final, sync-checked Persian subtitle text.`;
    return await this._callBatchAgent('phantomSync', prompt, batch, config.GEMINI_SYNC_MODEL);
  }
}

import { GoogleGenAI } from '@google/genai'

if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
}

export const gemini = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
})

export const INVESTIGATION_SCHEMA = {
    type: 'object',
    properties: {
        rootCause: {
            type: 'string',
            description: 'Evidence-backed explanation of the financial exception.',
        },
        evidenceUsed: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific evidence fields or record relationships used.',
        },
        confidence: {
            type: 'number',
            description: 'Confidence from 0 to 1 based only on supplied evidence.',
        },
        proposedAction: {
            type: 'string',
            enum: ['auto_resolve', 'escalate_unresolved', 'needs_review'],
        },
        controllerNote: {
            type: 'string',
            description: 'Concise explanation suitable for a LedgerAnalyser.',
        },
    },
    required: [
        'rootCause',
        'evidenceUsed',
        'confidence',
        'proposedAction',
        'controllerNote',
    ],
}
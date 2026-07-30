#!/bin/bash
sed -i '/import { GoogleGenAI } from '"'"'@google\/genai'"'"';/a \
\
let aiClient: GoogleGenAI | null = null;\
try {\
  aiClient = new GoogleGenAI({ apiKey: "DUMMY_API_KEY" });\
} catch (e) {\
  console.error("Failed to initialize GoogleGenAI", e);\
}\
' artifacts/salon-platform/src/components/CustomerIntelligence.tsx

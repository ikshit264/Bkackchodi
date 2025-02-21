import { ChatPromptTemplate } from "@langchain/core/prompts";
import { NextResponse } from "next/server";
import { PROMPT } from "@/utils/prompt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StringOutputParser } from "@langchain/core/output_parsers";
// import { ChatGroq } from "@langchain/groq";


// const llm = new ChatGroq({
//   apiKey : process.env.GROQ_API_KEY,
//   model: "deepseek-r1-distill-qwen-32b",
//   temperature: 0,
//   maxTokens: undefined,
//   maxRetries: 2,
//   verbose : true,
// })

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash-001",
  temperature: 0,
  apiKey: process.env.GEMINI_API_KEY,
  verbose: true,
  maxOutputTokens : 12000,
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", PROMPT as string],
  [
    "human",
    `Generate a learning roadmap for:
    - Topic: {topic}
    - Duration: {time_duration} months
    `,
  ],
]);

const outputParser = new StringOutputParser();

const chain = prompt.pipe(llm).pipe(outputParser);

export async function POST(req: Request) {
  try {
    const { topic, time_duration } = await req.json();

    const res = await chain.invoke({
      topic,
      time_duration,
    });

    const { jsonObject, text } = separateJSONandText(res);

    return NextResponse.json({ jsonObject, text });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}


function separateJSONandText(data: string): { jsonObject: string; text: string } {
  const jsonMatches = data.match(/```json([\s\S]*?)```/g);
  const jsonObject = jsonMatches ? jsonMatches.map(match => match.replace(/```json|```/g, "").trim()).join("\n") : "";
  const text = data.replace(/```json([\s\S]*?)```/g, "").trim();
  return { jsonObject, text };
}

import { GoogleGenAI } from "@google/genai";
import { Film } from "../types";

// NOTE: In a production app, the API Key should be proxy-ed through a backend
// to avoid exposing it. For this demo, we assume process.env.API_KEY is available.
const API_KEY = process.env.API_KEY || ''; 

// We handle the case where key is missing gracefully in the UI
const genAI = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const geminiService = {
  getFilmInsight: async (film: Film): Promise<string> => {
    if (!genAI) throw new Error("Gemini API Key not configured");

    try {
      const model = "gemini-2.5-flash";
      const prompt = `
        Act as a professional film critic and recommender. 
        I am considering watching the movie "${film.title}" (${film.year}).
        
        Details:
        - Director: ${film.directors.join(", ")}
        - Genres: ${film.genres.join(", ")}
        - Rating: ${film.rating}/10
        - Plot: ${film.description}
        
        Provide a concise, 2-sentence hook on why this movie is worth watching (or not), 
        focusing on its cinematic qualities or cultural impact. Do not simply repeat the plot.
      `;

      const response = await genAI.models.generateContent({
        model,
        contents: prompt,
      });

      return response.text || "Could not generate insight.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "AI insight temporarily unavailable.";
    }
  }
};

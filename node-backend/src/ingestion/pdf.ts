import pdf from "pdf-parse";
import { VectorStore } from "../vectorStore.js"; // Import the VectorStore class for typing

// This function takes PDF data as a buffer
export async function ingestPdf(pdfData: Buffer, filename: string, vectorStore: VectorStore) {
    // Add a check to ensure the PDF data is not empty
    if (!pdfData || pdfData.length === 0) {
        console.error("PDF ingestion failed: File is empty.");
        return 0; // Return 0 chunks for an empty file
    }

    try {
        // Use the pdf-parse library to get the text
        const data = await pdf(pdfData);
        
        // Split the text into chunks
        // You can use a simple split or a more advanced chunking method
        const text = data.text;
        const chunks = text.match(/.{1,1000}/g); // Example: Split into 1000-character chunks

        // FIXED: Check if chunks is null before mapping over it
        if (!chunks) {
            console.error(`PDF ingestion failed for ${filename}: No text chunks found.`);
            return 0;
        }
        
        // Add chunks to the vector store
        const metadatas = chunks.map(() => ({ source: filename }));
        const totalChunks = await vectorStore.addTexts(chunks, metadatas);
        
        console.log(`Successfully ingested ${totalChunks} chunks from ${filename}.`);
        return totalChunks;

    } catch (e) {
        console.error(`Error ingesting PDF: ${filename}`, e);
        throw e; // Re-throw the error for the main app to handle
    }
}

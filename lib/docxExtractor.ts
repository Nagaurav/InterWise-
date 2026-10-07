import mammoth from 'mammoth';

// Explicitly mark this as an ES module
export {};

declare global {
  interface File {
    arrayBuffer(): Promise<ArrayBuffer>;
  }
}

// Function to extract text from DOCX files
export const extractTextFromDocx = async (file: File): Promise<string> => {
  try {
    console.log("=== Starting Word document extraction ===");
    console.log("File details:", {
      name: file?.name || 'No name',
      type: file?.type || 'No type',
      size: file?.size || 0,
      lastModified: file?.lastModified ? new Date(file.lastModified).toISOString() : 'Unknown',
      isFile: file instanceof File
    });

    if (!file) {
      const errorMsg = "No file provided for Word document extraction";
      console.warn(errorMsg);
      return errorMsg;
    }

    if (file.size === 0) {
      const errorMsg = "Empty file provided";
      console.warn(errorMsg);
      return errorMsg;
    }

    // More lenient check for Word documents
    const isWordDoc = file.type.includes('word') || 
                     file.type.includes('officedocument') || 
                     file.name.toLowerCase().endsWith('.docx') ||
                     file.name.toLowerCase().endsWith('.doc');
    
    if (!isWordDoc) {
      const errorMsg = `Unsupported file type: ${file.type || 'unknown'}. Expected Word document (.docx or .doc)`;
      console.warn(errorMsg);
      return errorMsg;
    }

    console.log(`Starting Word document extraction for: ${file.name} (${Math.round(file.size / 1024)} KB)`);

    // Convert File to ArrayBuffer
    let arrayBuffer: ArrayBuffer;
    try {
      console.log("Reading file content as ArrayBuffer...");
      const startTime = Date.now();
      arrayBuffer = await file.arrayBuffer();
      const readTime = Date.now() - startTime;
      
      console.log(`Successfully read ${arrayBuffer.byteLength} bytes in ${readTime}ms`);
      
      if (arrayBuffer.byteLength === 0) {
        const errorMsg = "File is empty (0 bytes)";
        console.error(errorMsg);
        return errorMsg;
      }
      
      // Check if the file has a valid DOCX header (PK header for ZIP format)
      const header = new Uint8Array(arrayBuffer, 0, 4);
      const isZip = header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04;
      console.log(`File header check - Is ZIP/DOCX format: ${isZip}`);
      
      if (!isZip) {
        console.warn("File doesn't appear to be a valid DOCX (ZIP) file. Header:", Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' '));
      }
      
    } catch (readError) {
      const errorMsg = `Error reading file: ${readError instanceof Error ? readError.message : 'Unknown error'}`;
      console.error(errorMsg, readError);
      return errorMsg;
    }

    try {
      // Extract text using mammoth
      console.log("Starting mammoth text extraction...");
      const startTime = Date.now();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const extractTime = Date.now() - startTime;
      console.log(`Mammoth extraction completed in ${extractTime}ms`);
      
      console.log('Mammoth extraction result:', {
        hasValue: !!result?.value,
        valueLength: result?.value?.length,
        messages: result?.messages || []
      });
      
      if (!result?.value || result.value.trim().length === 0) {
        const warning = "No text content found in Word document";
        console.warn(warning);
        return `Warning: ${warning}`;
      }

      // Log any conversion messages/warnings
      if (result.messages && result.messages.length > 0) {
        console.log("Word extraction messages:", JSON.stringify(result.messages, null, 2));
      }

      console.log(`✅ Word extraction successful: ${result.value.length} characters extracted`);
      console.log("Word text preview:", result.value.substring(0, 300));
      
      // Clean up the extracted text
      const cleanedText = result.value
        .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
        .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
        .trim();

      return cleanedText;
    } catch (error) {
      console.error("Error extracting text from Word document:", error);
      
      // Provide more specific error information
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      
      // Return a fallback message instead of empty string
      return `Word document received: ${file.name} (${Math.round(file.size / 1024)} KB) - Processing failed, please try again or use paste option`;
    }
  } catch (error) {
    console.error("Unexpected error in extractTextFromDocx:", error);
    return `Error processing document: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

// Enhanced extractor that handles both PDF and Word documents
export const extractTextFromDocument = async (file: File): Promise<string> => {
  console.log('=== Starting document extraction ===');
  console.log('File details:', {
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : 'Unknown'
  });
  
  try {
    const fileName = file.name.toLowerCase().trim();
    const fileType = file.type.toLowerCase().trim();
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    console.log('Document analysis:', {
      fileName,
      fileType,
      fileExtension,
      isPDF: fileType === 'application/pdf' || fileExtension === 'pdf'
    });

    // Check file size
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed size (5MB)`);
    }

    console.log('File type detection:', {
      fileType,
      fileExtension,
      isPdfMime: fileType === 'application/pdf'
    });

    // Check if file is a PDF
    const isPDF = fileType === 'application/pdf' || fileExtension === 'pdf';
    
    if (!isPDF) {
      throw new Error(`Unsupported file type: ${fileType || 'unknown'}. Please upload a PDF document.`);
    }

    // Extract text from PDF
    try {
      console.log('Detected PDF document, extracting text...');
      const { extractTextFromPDF } = await import('./pdfExtractor');
      const text = await extractTextFromPDF(file);
      
      if (!text || text.trim().length === 0) {
        throw new Error('PDF extraction returned empty content');
      }
      
      console.log('Successfully extracted text from PDF document');
      return text;
    } catch (error) {
      console.error('PDF extraction failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during PDF extraction';
      return `Error processing PDF document: ${errorMessage}`;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during document processing';
    const fileName = file.name || 'unknown file';
    console.error(`Error processing file ${fileName}:`, error);
    return `Error processing file ${fileName}: ${errorMessage}`;
  }
};

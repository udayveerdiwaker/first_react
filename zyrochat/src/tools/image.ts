export async function generateImage(prompt: string): Promise<string> {
  const cleanPrompt = prompt.trim();
  
  try {
    // Call the backend endpoint to get the image
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: cleanPrompt }),
    });
    
    if (!response.ok) {
      throw new Error(`Image generation failed: ${response.statusText}`);
    }
    
    // Check if the response is JSON (URL) or binary (image)
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // Response is JSON with imageUrl
      const data = await response.json();
      if (data.imageUrl) {
        return data.imageUrl;
      }
      throw new Error(data.error || 'Unknown error from server');
    } else {
      // Response is binary image data
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      return imageUrl;
    }
  } catch (error) {
    console.error('Image generation error:', error);
    throw new Error('Failed to generate image. Please try again.');
  }
}

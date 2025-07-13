const fs = require('fs');

// Read your actual bookmark file
const htmlContent = fs.readFileSync('C:\\Users\\Xav\\Documents\\bookmarks_7_13_25.html', 'utf8');

// Test the API call
async function testAPICall() {
  console.log('Testing API call...');
  console.log('File size:', htmlContent.length, 'characters');
  console.log('File starts with:', htmlContent.substring(0, 100));
  
  const requestBody = {
    fileContent: htmlContent,
    fileName: 'bookmarks_7_13_25.html'
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/bookmarks/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.text();
    console.log('Response body:', result);
    
    if (response.ok) {
      const jsonResult = JSON.parse(result);
      console.log('Success! Imported:', jsonResult.imported, 'bookmarks');
    } else {
      console.log('Error response:', result);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testAPICall();

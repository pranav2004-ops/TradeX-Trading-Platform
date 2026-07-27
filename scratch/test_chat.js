async function testChat() {
  try {
    console.log("Sending request to /api/chat...");
    const response = await fetch("http://localhost:5000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "What are 3 tips for day trading?",
        history: [],
        user: { name: "Pranavaa" }
      })
    });

    if (!response.ok) {
      console.error("HTTP Error:", response.status, response.statusText);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    console.log("\n--- STREAMED RESPONSE ---\n");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      process.stdout.write(chunk);
    }
    console.log("\n\n--- END OF STREAM ---");
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

testChat();

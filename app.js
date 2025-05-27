let itemData = null;
let currentNodeNr = null;

// Load the data from the JSON file
fetch('data.json')
    .then(response => response.json())
    .then(data => {
        // Assign data to global object
        itemData = data;

        // Show the first message
        displayChatMessage(itemData[0].text, 'received');
        currentNodeNr = 0;
        // Enable the input
        document.getElementById('chat-input').disabled = false;
    })
    .catch(error => console.error("Error loading data.json: ", error));

var input = document.getElementById("chat-input");
input.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendButton();
    }
});

function displayChatMessage(text, cssClass) {
    // Create and grab the chat objects
    const chatMessage = document.createElement('div');
    const chatMessages = document.querySelector('.chat-messages');
    // Add the input to the chat
    chatMessage.textContent = text;
    chatMessage.classList.add('chat-message', cssClass);
    chatMessages.appendChild(chatMessage);
}

function sendButton() {
    // Get the user input and clear input field
    const userInput = document.getElementById('chat-input').value.trim();
    document.getElementById('chat-input').value = '';
    if (userInput) {  // If there is input
        // Disable the input
        document.getElementById('chat-input').disabled = true;
        // Display the user message
        displayChatMessage(userInput, 'sent');

        // Get all keyword route options for the current node
        const currentRoutes = itemData[currentNodeNr].routes;
        routeLoop:  // make label to break out of nested loop
        for (route in currentRoutes) {
            // Get keywords and targetnode for route
            const routeKeywords = currentRoutes[route].keywords;
            const routeTargetNode = currentRoutes[route].route;

            // If the route has keywords (not last node)
            if (routeKeywords) {
                for (k in routeKeywords) {
                    // Get all possible keywords from the node
                    const keyword = routeKeywords[k];
                    // Check if a keyword is in the user input
                    if (userInput.toLowerCase().includes(keyword.toLowerCase())) {
                        // Update the node and add the response with new question to the chat
                        currentNodeNr = routeTargetNode;
                        displayChatMessage(itemData[currentNodeNr].text, 'received')
                        break routeLoop;
                    }
                }
            } else {  // The last option routes to next node
                // Update the node and add the response with new question to the chat
                currentNodeNr = routeTargetNode;
                displayChatMessage(itemData[currentNodeNr].text, 'received')
                break routeLoop;
            }
        }

        // Enable the input again
        document.getElementById('chat-input').disabled = false;
    }
}
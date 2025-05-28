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

let informationData = null;

fetch('information.json')
    .then(response => response.json())
    .then(data => {

        informationData = data;
        // Create tab links and content divs
        var tabsContainer = document.getElementById('tabs');
        var contentContainer = document.getElementById('content');

        data.forEach(function (item, index) {
            // Create tab link
            var tabLink = document.createElement('a');
            tabLink.textContent = item.name;
            tabLink.classList.add("tab-link");
            tabLink.onclick = function () { selectTab(index); };

            tabsContainer.appendChild(tabLink);

            // Create iframe for content
            var iframe = document.createElement('iframe');
            iframe.src = item.content;
            iframe.width = '90%';
            iframe.height = '100%';

            if (index === 0) {
                iframe.style.display = 'block';
            } else {
                iframe.style.display = 'none';
            }

            contentContainer.appendChild(iframe);
        });
    })
    .catch(error => console.error("Error loading information.json: ", error));

document.getElementById("chat-input").addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendButton();
    }
});

function displayChatMessage(text, cssClass, delay = 0) {
    // Create and grab the chat objects
    const chatMessage = document.createElement('div');
    const chatMessages = document.querySelector('.chat-messages');

    // Add the input to the chat, iterating over it if there is an array
    if (Array.isArray(text)) {
        text.forEach((item) => {
            displayChatMessage(item.content, cssClass, item.delay);
        });
    } else {
        chatMessage.textContent = text;
        chatMessage.classList.add('chat-message', cssClass);

        // delay the message display by the delay timer
        setTimeout(() => {
            chatMessages.appendChild(chatMessage);
        }, delay);
    }
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

function selectTab(index) {
    informationData.forEach(function (item, i) {
        var iframe = document.getElementById('content').children[i];
        if (i === index) {
            iframe.style.display = 'block';
        } else {
            iframe.style.display = 'none';
        }
    });
}
// Fetch all questions and save them into a variable for later access
// Define node tracker variable
let itemData = null;
let currentNode = null;

fetch("questions.json")
    .then(response => response.json())
    .then(data => {
        itemData = data;
        currentNode = 0;
        nodeHandler(currentNode);
    })
    .catch(error => console.error("Error loading questions.json: ", error));

// Fetch all information sources and add them as tabs
fetch('information.json')
    .then(response => response.json())
    .then(data => {

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

            // Show the first information tab by default
            if (index === 0) {
                iframe.style.display = 'block';
            } else {
                iframe.style.display = 'none';
            }

            contentContainer.appendChild(iframe);
        });
    })
    .catch(error => console.error("Error loading information.json: ", error));

// Setup Enter as submit button and disable input
// TODO: do we want Enter to submit > possibly more accidental submits
document.getElementById("chat-input").addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendButton();
    }
});
document.getElementById('chat-input').disabled = true;

// Open the selected tab by hiding all other tabs
function selectTab(index) {
    var iframes = document.getElementById('content').children;
    for (var i = 0; i < iframes.length; i++) {
        var iframe = document.getElementById('content').children[i];
        if (i === index) {
            iframe.style.display = 'block';
        } else {
            iframe.style.display = 'none';
        }
    }
}

// Move to the selected node, displaying the relevant messages
function nodeHandler(nodeIndex) {
    console.log("Going to node " + nodeIndex);

    let item = itemData[nodeIndex];
    let delayCounter = 0;

    item.messages.forEach(message => {
        if (message.delay) delayCounter += message.delay;

        setTimeout(() => {
            addChatMessage(message.content, message.type)
        }, delayCounter);

    });

    // Wait until all messages have been sent to continue
    setTimeout(() => {
        if (item.question) {

            if (item.question == "multipleChoice") {
                addMultipleChoiceMessages(item.options);
                // item.options.forEach(option => {
                //     addChatMessage(option, 'multipleChoiceOption');
                // });
            } else {

                // Item is an open question, enable the answer field after all messages have been sent
                document.getElementById('chat-input').disabled = false;
            }
        } else {
            if (item.endTest) {
                // Last node in the test
                console.log("End of test is reached.");
            } else {
                // Item is not a question, move to next node
                nodeHandler(item.routes[0].gotoNode);
            }
        }
    }, delayCounter);

    currentNode = nodeIndex;
}

let multipleChoiceCounter = 0;

function addMultipleChoiceMessages(options) {
    let optionsMessage = document.createElement('div');
    optionsMessage.classList.add('chat-options');
    optionsMessage.id = multipleChoiceCounter;
    let chatMessagesContainer = document.querySelector('.chat-messages');

    options.forEach((option, index) => {
        let optionMessage = document.createElement('div');
        optionMessage.classList.add('chat-message', 'multipleChoiceOption');
        let optionLink = document.createElement('a');
        optionLink.textContent = option;
        optionLink.onclick = function () {
            checkAnswer(index);
        };
        optionMessage.appendChild(optionLink);
        optionsMessage.appendChild(optionMessage);
    });

    chatMessagesContainer.appendChild(optionsMessage);
}

// Add a chat message to the chat, taking into account it's type
function addChatMessage(message, type) {

    if (!message || !type) {
        console.error("No message or message type was was specified!", message, type);
        return;
    }

    let chatMessage = document.createElement('div');
    let chatMessagesContainer = document.querySelector('.chat-messages');

    chatMessage.textContent = message;
    // if (type == "received" || type == "sent" || type == "prompt") 
    chatMessage.classList.add('chat-message', type);
    chatMessagesContainer.appendChild(chatMessage);
}

function sendButton() {
    // Get the user input and clear input field
    let userInput = document.getElementById('chat-input').value;
    const cleanedInput = document.getElementById('chat-input').value.trim().toLowerCase();
    document.getElementById('chat-input').value = '';
    if (cleanedInput) {  // If there is input
        // Disable the input
        document.getElementById('chat-input').disabled = true;
        // Display the user message
        addChatMessage(userInput, "sent");

        checkAnswer(cleanedInput);
    }
}

function checkAnswer(answer) {
    let item = itemData[currentNode];

    switch (item.question) {
        case "open":
            // Check all routes
            routeLoopBreakpoint:  // making a label to break out of the nested for-loop
            for (let route of item.routes) {
                // If the route has keywords (is a correct answer), check against answer
                if (route.keywords) {
                    for (let keyword of route.keywords) {
                        if (answer.includes(keyword.trim().toLowerCase())) {
                            // If the given answer includes some keywords, move to the given node
                            nodeHandler(route.gotoNode);
                            break routeLoopBreakpoint;
                        }
                    }
                } else {
                    // Route has no keywords, aka last route, move to the given node
                    nodeHandler(route.gotoNode);
                    break routeLoopBreakpoint;
                }
            }
            break;
        case "multipleChoice":
            console.log("Option number:", answer);
            let answered = false;

            // Check all routes
            for (let index = 0; index < item.routes.length; index++) {
                if (index == String(answer)) {
                    // Add the given answer to the chat and delete the options
                    addChatMessage(item.options[index], 'sent');
                    document.getElementsByClassName('chat-options')[multipleChoiceCounter].classList.add('hidden');
                    multipleChoiceCounter++;

                    // Given answer occurs in the routes, follow the route
                    nodeHandler(item.routes[index].gotoNode);
                    answered = true;
                    break;
                }
            }

            if (!answered) console.error("The given answer is not a valid option.", answer);
            break;
        default:
            console.error("It seems like this question type is not supported: ", item.question);
            break;
    }
}
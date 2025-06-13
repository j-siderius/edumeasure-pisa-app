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
        answers.startTime = Date.now();
    })
    .catch(error => console.error("Error loading questions.json: ", error));

fetch('settings.json')
    .then(response => response.json())
    .then(data => {
        document.querySelector('.profile-picture').src = data.profile_picture;
        document.querySelector('.profile-name').textContent = data.name;
    })
    .catch(error => console.error("Error loading settings.json: ", error));



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

            if (item.hidden) {
                tabLink.classList.add("hidden");
            }

            tabsContainer.appendChild(tabLink);

            // Create iframe for content
            var iframe = document.createElement('iframe');
            iframe.src = item.content;

            // Show the first information tab by default
            if (index === 0) {
                iframe.style.display = 'block';
            } else {
                iframe.style.display = 'none';
            }

            window.addEventListener('message', function (event) {
                // Goto selected tab using the passed through target index of the tab
                let targetTab = event.data.target;
                switch (targetTab) {
                    case 'book_review':
                        selectTab(1);  // TODO: figure out how to remove hardcode
                        break;
                    case 'science_news':
                        selectTab(2);  // TODO: figure out how to remove hardcode
                        break;
                    default:
                        console.error("Specified target is not a tab.:", targetTab);
                        break;
                }
            });

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
    var tabLinks = document.getElementsByClassName('tab-link');
    var iframes = document.getElementById('content').children;
    for (var i = 0; i < iframes.length; i++) {
        var iframe = document.getElementById('content').children[i];
        if (i === index) {
            if (tabLinks[i].classList.contains("hidden")) {
                tabLinks[i].classList.remove("hidden");
            }
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
            } else if (item.question == "multipleChoiceImage") {
                addMultipleChoiceImages(item.options);
            } else {
                // Item is an open question, enable the answer field after all messages have been sent
                document.getElementById('chat-input').disabled = false;
            }
        } else {
            if (item.endTest) {
                // Last node in the test
                answers.endTime = Date.now();
                console.log("End of test is reached. Run `exportAnswers()` in order to download the answers.");
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

    // Create a container for the multiple choice options
    let optionsMessage = document.createElement('div');
    optionsMessage.classList.add('chat-options');
    optionsMessage.id = multipleChoiceCounter;

    // Add the new options to the chat messages container
    let chatMessagesContainer = document.querySelector('.chat-messages');

    // Create and add each option link
    options.forEach((option, index) => {
        let optionMessage = document.createElement('div');
        optionMessage.classList.add('chat-message', 'multipleChoiceOption');

        // Add an event listener to the option message
        let optionLink = document.createElement('a');
        optionLink.textContent = option;
        optionLink.onclick = function () {
            checkAnswer(index);  // Pass the selected index to the answer checker
        };

        // Append link to option message
        optionMessage.appendChild(optionLink);
        optionsMessage.appendChild(optionMessage);
    });

    chatMessagesContainer.appendChild(optionsMessage);

    checkScrollBar();
    scrollToBottomChat();
}

let multipleChoiceImageCounter = 0;

function addMultipleChoiceImages(options) {
    let optionsMessage = document.createElement('div');
    optionsMessage.classList.add('chat-images');
    optionsMessage.id = multipleChoiceImageCounter;

    // Add the new options to the chat messages container
    let chatMessagesContainer = document.querySelector('.chat-messages');

    options.forEach((option, index) => {
        let optionMessage = document.createElement('div');
        optionMessage.classList.add('chat-message', 'multipleChoiceImage');

        let optionImage = document.createElement('img');
        optionImage.src = option;
        optionImage.onclick = function () {
            checkAnswer(index);  // Pass the selected index to the answer checker
        };

        optionMessage.appendChild(optionImage);
        optionsMessage.appendChild(optionMessage);
    });

    chatMessagesContainer.appendChild(optionsMessage);

    checkScrollBar();
    scrollToBottomChat();
}

// Add a chat message to the chat, taking into account it's type
function addChatMessage(message, type) {

    if (!message || !type) {
        console.error("No message or message type was was specified!", message, type);
        return;
    }

    let chatMessage = document.createElement('div');
    let chatMessagesContainer = document.querySelector('.chat-messages');

    if (type == 'sentImage') {
        let sentImage = document.createElement('img');
        sentImage.src = message;
        chatMessage.appendChild(sentImage);
    } else {
        chatMessage.textContent = message;
    }
    chatMessage.classList.add('chat-message', type);
    chatMessagesContainer.appendChild(chatMessage);

    checkScrollBar();
    scrollToBottomChat();

}

function scrollToBottomChat() {
    const chatMessages = document.querySelector('.chat-messages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

let overflownChatMessages = false;

function checkScrollBar() {
    if (!overflownChatMessages) {
        const chatMessages = document.querySelector('.chat-messages');

        chatMessages.classList.add('has-overflow');
        let overflow = chatMessages.scrollHeight > chatMessages.clientHeight;
        chatMessages.classList.remove('has-overflow');

        if (overflow) {
            overflownChatMessages = true;
            chatMessages.classList.add('has-overflow');
            scrollToBottomChat();
        }
    }
}

function sendButton() {
    // Get the user input and clear input field
    let userInput = document.getElementById('chat-input').value;
    document.getElementById('chat-input').value = '';
    if (userInput.trim()) {  // If there is input
        // Disable the input
        document.getElementById('chat-input').disabled = true;
        // Display the user message
        addChatMessage(userInput, "sent");
        checkAnswer(userInput);
    } else {
        console.error("No input message was specified!");
    }
}

let answers = {};

function saveAnswer(type, answer, proceedNode) {
    answers[currentNode] = {
        "type": type,
        "answer": answer,
        "proceedNode": proceedNode,
        "time": Date.now()
    };

    if (type === "open") {
        answers[currentNode]["readabilityScores"] = getReadabilityScores(answer);
    }
}

let username = "John Example";

function exportAnswers() {
    // Generate a data blob that contains all answers in JSON format, then make a link and download the file
    const blob = new Blob([JSON.stringify(answers, null, 2)], {
        type: "application/json",
    });

    const link = document.createElement("a");
    link.download = username.replace(/\s/g, "") + "-" + Date.now() + "-answers.json";
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);

    link.click();
    document.body.removeChild(link);
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
                            // Save the answer and proceed node
                            saveAnswer("open", answer, route.gotoNode);
                            break routeLoopBreakpoint;
                        }
                    }
                } else {
                    // Route has no keywords, aka last route, move to the given node
                    nodeHandler(route.gotoNode);
                    // Save the answer and proceed node
                    saveAnswer("open", answer, route.gotoNode);
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
                    saveAnswer("multipleChoice", answer, item.routes[index].gotoNode);
                    answered = true;
                    break;
                }
            }

            if (!answered) console.error("The given answer is not a valid option.", answer);
            break;
        case "multipleChoiceImage":
            console.log("Image option:", answer);
            let answeredImage = false;

            // Check all routes
            for (let index = 0; index < item.routes.length; index++) {
                if (index == String(answer)) {
                    // Add the given answer to the chat and delete the options
                    addChatMessage(item.options[index], 'sentImage');
                    document.getElementsByClassName('chat-images')[multipleChoiceImageCounter].classList.add('hidden');
                    multipleChoiceCounter++;

                    // Given answer occurs in the routes, follow the route
                    nodeHandler(item.routes[index].gotoNode);
                    saveAnswer("multipleChoiceImage", answer, item.routes[index].gotoNode);
                    answeredImage = true;
                    break;
                }
            }

            if (!answeredImage) console.error("The given answer is not a valid option.", answer);
            break;
        default:
            console.error("It seems like this question type is not supported: ", item.question);
            break;
    }
}
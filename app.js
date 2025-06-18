// DEBUG DISABLES TIMERS
const DEBUG = false;

// Fetch all questions and save them into a variable for later access
// Define node tracker variable
let itemData = null;
let currentNode = null;

function startTest() {

    // hide modal
    document.querySelector('.modal.fullscreen').classList.add("hidden");
    // show chat and reader
    document.querySelector(".chat-window").classList.remove("hidden");
    document.querySelector(".reader").classList.remove("hidden");

    // Load the questions and start the chat
    fetch("questions.json")
        .then(response => response.json())
        .then(data => {
            itemData = data;
            currentNode = 0;
            nodeHandler(currentNode);
            answers.startTime = Date.now();
        })
        .catch(error => console.error("Error loading questions.json: ", error));
}


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

            // Hide all information tabs by default
            iframe.style.display = 'none';

            window.addEventListener('message', function (event) {
                // Goto selected tab using the passed through target index of the tab
                let targetTab = event.data.target;
                switch (targetTab) {
                    case 'y_post':
                        selectTab(0);  // TODO: figure out how to remove hardcode
                        break;
                    case 'book_review':
                        selectTab(2);  // TODO: figure out how to remove hardcode
                        break;
                    case 'science_news':
                        selectTab(3);  // TODO: figure out how to remove hardcode
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
document.getElementById('send-button').disabled = true;

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
            addChatMessage(message.content, message.type, message.openTab)
        }, DEBUG ? 0 : delayCounter);

    });

    // Wait until all messages have been sent to continue
    setTimeout(() => {
        if (item.question) {

            document.getElementById('chat-input').disabled = true;
            document.getElementById('send-button').disabled = true;

            if (item.question == "multipleChoice") {
                addMultipleChoiceMessages(item.options);
            } else if (item.question == "multipleChoiceImage") {
                addMultipleChoiceImages(item.options);
            } else if (item.question == "dragAndDrop") {
                addDragAndDrop(item.options, item.dropTargets);
            } else {
                // Item is an open question, enable the answer field after all messages have been sent
                document.getElementById('chat-input').disabled = false;
                document.getElementById('send-button').disabled = false;
            }
        } else {
            if (item.endTest) {
                // Last node in the test
                answers.endTime = Date.now();
                // console.log("End of test is reached. Run `exportAnswers()` in order to download the answers.");
                setTimeout(() => {
                    exportAnswers();
                }, 2500);
            } else {
                // Item is not a question, move to next node
                nodeHandler(item.routes[0].gotoNode);
            }
        }
    }, DEBUG ? 0 : delayCounter);

    currentNode = nodeIndex;
}

let dropCounter = 0;

function addDragAndDrop(options, dropTargets) {
    let optionsMessage = document.createElement('div');
    optionsMessage.classList.add('chat-drop');
    optionsMessage.id = dropCounter;
    let dropTargetMessage = document.createElement('div');
    dropTargetMessage.classList.add('drop-targets');

    // Add the new options to the chat messages container
    let chatMessagesContainer = document.querySelector('.chat-messages');

    // Compare length of options to length of dropTargets
    if (!options.length === dropTargets.length) {
        console.error("Options and dropTargets do not have the same length. Please check your JSON file.", options.length, dropTargets.length);
        return;
    }

    // Create and add each option link
    options.forEach((option, index) => {
        let optionMessage = document.createElement('div');
        optionMessage.classList.add('chat-message', 'multipleChoiceImage');

        if (option.includes(".png") || option.includes(".jpg") || option.includes(".jpeg")) {
            let optionImage = document.createElement('img');
            optionImage.src = option;
            optionImage.draggable = true;
            optionImage.id = index + " " + option;
            optionImage.classList.add('dropOption');

            optionImage.ondragstart = dragstartHandler;
            optionMessage.appendChild(optionImage);
        } else {
            let optionText = document.createElement('span');
            optionText.innerHTML = option;
            optionText.draggable = true;
            optionText.id = index + " " + option;
            optionText.classList.add('dropOption');

            optionText.ondragstart = dragstartHandler;
            optionMessage.appendChild(optionText);

            optionMessage.classList.add('nohover');
        }


        optionsMessage.appendChild(optionMessage);
    });

    chatMessagesContainer.appendChild(optionsMessage);
    let horizontalDivide = document.createElement('hr');
    horizontalDivide.classList.add('dropDivide');
    horizontalDivide.id = dropCounter;
    chatMessagesContainer.appendChild(horizontalDivide);


    let optionsMessage2 = document.createElement('div');
    optionsMessage2.classList.add('chat-answers');
    optionsMessage2.id = dropCounter;

    // Create and add each target
    dropTargets.forEach((dropTarget, index) => {
        let dropTargetDiv = document.createElement('div');
        dropTargetDiv.classList.add('chat-message', 'multipleChoiceTarget');
        dropTargetDiv.id = index;

        let dropTargetName = document.createElement('span');
        dropTargetName.textContent = dropTarget; // Set the text content of the span to the drop target name

        dropTargetDiv.appendChild(dropTargetName);
        dropTargetName.ondragover = dragoverHandler; // Add the dragover handler function to the drop target div
        dropTargetName.ondrop = dropHandler;

        optionsMessage2.appendChild(dropTargetDiv); // Append the drop target div to the options message container
    });

    chatMessagesContainer.appendChild(optionsMessage2);

    checkScrollBar();
    scrollToBottomChat();

    document.getElementById('send-button').disabled = false;
}

// Drap and Drop handler functions
function dragstartHandler(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function dragoverHandler(ev) {
    ev.preventDefault();
}

function dropHandler(ev) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    ev.target.appendChild(document.getElementById(data));
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
function addChatMessage(message, type, openTab = null) {

    if (!message || !type) {
        console.error("No message or message type was was specified!", message, type);
        return;
    }

    if (openTab) {
        selectTab(openTab);
    }

    let chatMessage = document.createElement('div');
    let chatMessagesContainer = document.querySelector('.chat-messages');

    if (type == 'sentImage') {
        let sentImage = document.createElement('img');
        sentImage.src = message;
        chatMessage.appendChild(sentImage);
    } else {  // Post as innerHTML as we want to enable HTML text being entered.
        chatMessage.innerHTML = message;
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
    if (itemData[currentNode].question == "open") {

        // Get the user input and clear input field
        let userInput = document.getElementById('chat-input').value;
        document.getElementById('chat-input').value = '';
        if (userInput.trim()) {  // If there is input
            // Disable the input
            document.getElementById('chat-input').disabled = true;
            document.getElementById('send-button').disabled = true;
            // Display the user message
            addChatMessage(userInput, "sent");
            checkAnswer(userInput);
        } else {
            console.error("No input message was specified!");
            return;
        }
    } else if (itemData[currentNode].question == "dragAndDrop") {
        let answerDiv = document.getElementsByClassName('chat-answers')[dropCounter].children;

        let answers = [];

        Array.from(answerDiv).forEach((answer, index) => {
            if (answer.children[0].children[0]) {
                answers.push(answer.children[0].children[0].id);
                console.log(answer.children[0].children[0].id);
            } else {
                console.error("Not all drag and drop options were filled in!", index, answer)
            }
        });

        checkAnswer(answers);
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
    // link.download = username.replace(/\s/g, "") + "-" + Date.now() + "-answers.json";
    link.download = "PISA-Pilot2030-" + Date.now() + "-answers.json";
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
                    multipleChoiceImageCounter++;

                    // Given answer occurs in the routes, follow the route
                    nodeHandler(item.routes[index].gotoNode);
                    saveAnswer("multipleChoiceImage", answer, item.routes[index].gotoNode);
                    answeredImage = true;
                    break;
                }
            }

            if (!answeredImage) console.error("The given answer is not a valid option.", answer);
            break;

        case "dragAndDrop":
            console.log("dragAndDrop answer:", answer);

            document.getElementsByClassName('chat-drop')[dropCounter].classList.add('hidden');
            document.getElementsByClassName('dropDivide')[dropCounter].classList.add('hidden');

            nodeHandler(item.routes[0].gotoNode);
            saveAnswer("dragAndDrop", answer, item.routes[0].gotoNode);
            dropCounter++;

            break;
        default:
            console.error("It seems like this question type is not supported: ", item.question);
            break;
    }
}
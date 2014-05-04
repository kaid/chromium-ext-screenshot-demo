chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.sendMessage(tab.id, {task: "capture"});
});

chrome.runtime.onMessage.addListener(function(message, sender, respond) {
    chrome.tabs.captureVisibleTab(null, {format: "png"}, function(data_url) {
        respond(data_url);
    });
    
    return true;
});

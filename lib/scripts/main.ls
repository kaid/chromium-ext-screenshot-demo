chrome.browserAction.onClicked.addListener (tab)->
  chrome.tabs.sendMessage(tab.id, task: "capture")

chrome.runtime.onMessage.addListener (message, sender, respond)->
  console.log(message: message)
  chrome.tabs.captureVisibleTab null, format: "png", (data_url)->
    respond(data_url)
  
  return true

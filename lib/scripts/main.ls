chrome.browserAction.onClicked.addListener (tab)->
  chrome.tabs.sendMessage(tab.id, task: "capture")

(request, sender, respond) <- chrome.runtime.onMessage.addListener
switch request.task
| "capture"  => chrome.tabs.captureVisibleTab null, format: "png", respond
| otherwise  => console.log("unhandled request: ", request)

return true

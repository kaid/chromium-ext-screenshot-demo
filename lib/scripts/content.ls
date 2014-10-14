class jQueryProxy
  @jproxy = (el_name, methods)->
    method <~ methods.forEach
    @::[method] = (...args)->
      @[el_name][method](...args)
      @

class Overlay extends jQueryProxy
  @jproxy "$el", <[on show hide css appendTo remove trigger]>

  ->
    @bg   = {"background-color": "rgba(0,0,0,0.5)"}
    @nobg = {"background-color": "rgba(0,0,0,0)"}
    @$el  = jQuery("<div id=\"4ye-screenshot-overlay\"></div>")

    @$el
      .attr("style", "height:100%;width:100%;position:absolute;top:0;left:0;display:none;z-index:999999999;")
      .css(@bg)

    @$tl = jQuery("<div></div>")
      .attr("style", "position:absolute;top:0;left:0;")
      .appendTo(@$el)
      .css(@bg)

    @$tr = jQuery("<div></div>")
      .attr("style", "position:absolute;top:0;right:0;")
      .appendTo(@$el)
      .css(@bg)

    @$br = jQuery("<div></div>")
      .attr("style", "position:absolute;bottom:0;right:0;")
      .appendTo(@$el)
      .css(@bg)

    @$bl = jQuery("<div></div>")
      .attr("style", "position:absolute;bottom:0;left:0;")
      .appendTo(@$el)
      .css(@bg)

  select: (selected)->
    @$el.css @nobg

    @$tl.css do
      width:  selected.left + selected.width
      height: selected.top

    @$tr.css do
      width:  @$el.width() - (selected.left + selected.width)
      height: selected.top + selected.height

    @$tr.css do
      width:  @$el.width() - (selected.left + selected.width)
      height: selected.top + selected.height

    @$br.css do
      width:  @$el.width() - selected.left
      height: @$el.height() - (selected.top + selected.height)

    @$bl.css do
      width:  selected.left
      height: @$el.height() - selected.top


class Capture
  (@callback)->
    @overlay   = new Overlay
    @capturing = @binded = false
    @reset_selection()
    @bind()

  reset_selection: ->
    @start = x: 0, y: 0
    @selected = height: 16, width: 16, left: 0, top: 0

  bind: ->
    return if @binded

    @overlay.on "mousedown", (event)~>
      @reset_selection()
      @capturing = true

      @selected.top  = @start.y = event.pageY;
      @selected.left = @start.x = event.pageX;

    @overlay.on "mousemove", (event)~>
      if @capturing
        height = event.pageY - @start.y
        width  = event.pageX - @start.x
        
        @selected.top    = if height > 0 then @start.y else event.pageY
        @selected.left   = if width  > 0 then @start.x else event.pageX
        @selected.height = Math.abs(height)
        @selected.width  = Math.abs(width)
        
        @overlay.select(@selected)
    
    @overlay.on "mouseup", (event)~>
      @capturing = false
      @selected.left = @selected.left - jQuery(document).scrollLeft()
      @selected.top  = @selected.top  - jQuery(document).scrollTop()
      @overlay.trigger("save")  
    
    @overlay.on "save", ~>
      response <~ chrome.runtime.sendMessage @selected, _
      @crop(response)
    
    @binded = true

  crop: (data)->
    return if !data
    ImageCropper(data, @selected, @callback).exec()

  detach: ->
    @overlay.hide().remove()

  inject: -> 
    @overlay
      .css({"height": jQuery(document).height(), "width": jQuery(document).width()})
      .appendTo(jQuery("body"))
      .show()

  @inject = (callback)->
    return if @current
    @current = new this(callback)
    @current.inject()

  @detach = ->
    return if !@current
    @current.detach()
    @current = null


class ImageCropper
  (@data, @selected, @callback)~>
    @img    = new Image
    @canvas = document.createElement("canvas")
    @ctx    = @canvas.getContext("2d")
    @bind()

  exec: -> 
    @img.src = @data

  bind: ->
    @img.onload = ~>
      @canvas.width  = @selected.width
      @canvas.height = @selected.height
      
      @ctx.drawImage(@img,
                     @selected.left,
                     @selected.top,
                     @selected.width,
                     @selected.height,
                     0,
                     0,
                     @selected.width,
                     @selected.height)
      
      @callback(@canvas.toDataURL()) if @callback


class Popup extends jQueryProxy
  @jproxy "$el", <[show hide remove slideDown css appendTo attr fadeOut]>

  (@src)->
    @$el = jQuery("<div id=\"4ye-image-view\"></div>")

    @$img = jQuery("<img>")
      .appendTo(@$el)

    $button = jQuery("<div></div>")
      .attr("style", "box-shadow:0 0 8px #444;background-color:#000;display:inline-block;margin-top:12px;color:white;padding:4px;")

    @$submit = $button
      .clone()
      .text("提交")
      .appendTo(@$el)
      .css("float", "left")

    @$cancel = $button
      .clone()
      .text("取消")
      .appendTo(@$el)
      .css("float", "right")

    @attr("style", "position:fixed;top:0;left:0;bottom:0;right:0;margin:auto;z-index:99999999;")
      .hide()

    @$img
      .attr("style", "background-color:white;box-shadow:0 0 8px #444;")

    @appendTo(document.body)
    @bind()

  bind: ->
    @$img.on "load", ~>
      @css({"height": @$img[0].height + 64, "width": @$img[0].width})
      Capture.detach()
      @slideDown()

    @$img.attr("src", @src)
    
    @$img.on "upload", ~>
      @$submit.text("正在上传....")

      <~ ImageUploader(@src).exec
      @$submit.text("上传完毕!").css("background-color", "green")

      <~ @fadeOut
      @remove()
    
    @$submit.on "click", ~>
      @$img.trigger("upload")

    @$cancel.on "click", ~>
      <~ @fadeOut
      @remove()


class ImageUploader
  (data)~>
    @file = @to_blob(data)

  to_blob: (data)->
    BASE64_MARKER = "base64,"

    if data.indexOf(BASE64_MARKER) == -1
      parts = data.split(",")
      contentType = parts[0].split(":")[1]
      raw = parts[1]

      return new Blob([raw], type: contentType)

    parts = data.split(BASE64_MARKER)
    contentType = parts[0].split(":")[1]
    raw = window.atob(parts[1])
    rawLength = raw.length

    uInt8Array = new Uint8Array(rawLength)

    for i til rawLength
      uInt8Array[i] = raw.charCodeAt(i)

    new Blob([uInt8Array], type: contentType)

  exec: (callback)->
    @file.name = "image#{(new Date()).valueOf()}.png"

    data = new FormData

    data.append("file", @file, @file.name)

    deferred = jQuery.ajax do
      type        : "POST"
      contentType : false
      processData : false
      url         : "http://img.4ye.me/images"
      data        : data

    deferred.done(callback)
    

message <~ chrome.runtime.onMessage.addListener
switch message.task
| "capture" => Capture.inject((res) -> new Popup(res))
| otherwise => console.log("nothing")

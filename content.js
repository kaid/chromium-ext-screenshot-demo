function Capture() {
    this.bg   = {"background-color": "rgba(0,0,0,0.5)"};
    this.nobg = {"background-color": "none"};
    this.$overlay = jQuery("<div id=\"4ye-screenshot-overlay\"></div>");
    this.$selection = jQuery("<div id=\"4ye-screenshot-selection\"></div>").appendTo(this.$overlay);
    this.$overlay.attr("style", "height:100%;width:100%;position:absolute;top:0;left:0;display:none;z-index:999999999;").css(this.bg);
    this.$selection.hide().attr("style", "position:absolute;min-width:16px;min-height:16px;");
    this.$tl = jQuery("<div></div>").attr("style", "position:absolute;top:0;left:0;").appendTo(this.$overlay).css(this.bg);
    this.$tr = jQuery("<div></div>").attr("style", "position:absolute;top:0;right:0;").appendTo(this.$overlay).css(this.bg);
    this.$br = jQuery("<div></div>").attr("style", "position:absolute;bottom:0;right:0;").appendTo(this.$overlay).css(this.bg);
    this.$bl = jQuery("<div></div>").attr("style", "position:absolute;bottom:0;left:0;").appendTo(this.$overlay).css(this.bg);
    this.img = new Image;
    this.capturing = this.binded = false;
    this.reset_selection();
    this.bind();
}

Capture.prototype.reset_selection = function() {
    this.start = {x: 0, y: 0};
    this.selected = {height: 16, width: 16, left: 0, top: 0};
    this.$selection.css(this.selected).hide();
}

Capture.prototype.set_callback = function(callback) {
    this.callback = callback;
}

Capture.prototype.bind = function() {
    if (this.binded) return;

    var self = this;

    this.$overlay.on("mousedown", function(event) {
        self.$selection.hide(function() {
            self.reset_selection();
            self.capturing     = true;
            self.selected.top  = self.start.y = event.pageY;
            self.selected.left = self.start.x = event.pageX;

            if (0 === event.button) {
                self.$selection.css(self.selected).show();
            }
        });
    });
    
    this.$overlay.on("mousemove", function(event) {
        if (self.capturing) {
            var height = event.pageY - self.start.y
              , width  = event.pageX - self.start.x;
            
            self.selected.top    = height > 0 ? self.start.y : event.pageY;
            self.selected.left   = width  > 0 ? self.start.x : event.pageX;
            self.selected.height = Math.abs(height);
            self.selected.width  = Math.abs(width);
            
            self.$overlay.css(self.nobg);
            self.resize_overlay();
            self.$selection.css(self.selected);
        }
    });
    
    this.$overlay.on("mouseup", function(event) {
        self.capturing = false;
        self.selected.left = self.selected.left - jQuery(document).scrollLeft();
        self.selected.top  = self.selected.top  - jQuery(document).scrollTop();
        self.$overlay.css(self.nobg)
        self.$selection.trigger("save");  
    });
    
    this.$selection.on("save", function() {
        chrome.runtime.sendMessage(self.selected, function(response) {
            self.crop(response);
        });
    });
    
    this.binded = true;
}

Capture.prototype.resize_overlay = function() {
    this.$tl.css({width: this.selected.left + this.selected.width, height: this.selected.top})
    this.$tr.css({width: this.$overlay.width() - (this.selected.left + this.selected.width), height: this.selected.top + this.selected.height})
    this.$tr.css({width: this.$overlay.width() - (this.selected.left + this.selected.width), height: this.selected.top + this.selected.height})
    this.$br.css({width: this.$overlay.width() - this.selected.left, height: this.$overlay.height() - (this.selected.top + this.selected.height)})
    this.$bl.css({width: this.selected.left, height: this.$overlay.height() - this.selected.top})
}

Capture.prototype.inject = function() {
    this.$overlay.css({"height": jQuery(document).height(), "width": jQuery(document).width()});
    this.$overlay.appendTo(jQuery("body")).show();
}

Capture.prototype.detach = function() {
    this.$overlay.hide().remove();
}

Capture.prototype.crop = function(data) {
    if (!data) return;

    var self = this;
    
    this.img.onload = function() {
        var canvas = document.createElement("canvas")
          , ctx    = canvas.getContext("2d");

        canvas.width  = self.selected.width;
        canvas.height = self.selected.height;
        
        ctx.drawImage(self.img,
                      self.selected.left,
                      self.selected.top,
                      self.selected.width,
                      self.selected.height,
                      0,
                      0,
                      self.selected.width,
                      self.selected.height);
        
        if (self.img.croped) return;
        self.img.croped = true
        if (self.callback) self.callback(canvas.toDataURL());
    }
    
    this.img.src = data;
}

Capture.inject = function(callback) {
    if (this.current) return;
    this.current = new this;
    if (callback) this.current.set_callback(callback);
    this.current.inject();
}

Capture.detach = function() {
    if (!this.current) return;
    this.current.detach();
    this.current = null;
}

function data_url_to_blob(data_url) {
    var BASE64_MARKER = ';base64,';
    if (data_url.indexOf(BASE64_MARKER) == -1) {
        var parts = data_url.split(',');
        var contentType = parts[0].split(':')[1];
        var raw = parts[1];

        return new Blob([raw], {type: contentType});
    }

    var parts = data_url.split(BASE64_MARKER);
    var contentType = parts[0].split(':')[1];
    var raw = window.atob(parts[1]);
    var rawLength = raw.length;

    var uInt8Array = new Uint8Array(rawLength);

    for (var i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], {type: contentType});
}

function upload(file, fn) {
    file.name = "image" + (new Date).valueOf() + ".png";

    var data = new FormData;
    data.append("file", file, file.name);

    deferred = jQuery.ajax({
        type        : "POST",
        contentType : false,
        processData : false,
        url         : "http://img.4ye.me/images",
        data        : data
    });

    deferred.done(fn);
}

chrome.runtime.onMessage.addListener(function(message) {
    switch(message.task) {
        case "capture":
            Capture.inject(function(src) {
                var $container = jQuery("<div id=\"4ye-image-view\"></div")
                , $img = jQuery("<img src=\"javascript:void(0);\">").appendTo($container)
                , $button = jQuery("<div></div>").attr("style", "box-shadow:0 0 8px #444;background-color:#000;display:inline-block;margin-top:12px;color:#fff;padding:4px;")
                , $submit = $button.clone().text("提交").appendTo($container).css("float", "left")
                , $cancel = $button.clone().text("取消").appendTo($container).css("float", "right");

                $container = jQuery("#4ye-image-view").length > 0 ? jQuery("#4ye-image-view") : $container.appendTo(jQuery("body"));
                $container.attr("style", "position:fixed;top:0;left:0;bottom:0;right:0;margin:auto;z-index:99999999;").hide();
                $img.attr("style", "background-color:white;box-shadow:0 0 8px #444;");
                
                $img.on("load", function() {
                    $container.css({"height": $img[0].height + 64, "width": $img[0].width});
                    Capture.detach();
                    $container.slideDown();
                });

                $img.attr("src", src);
                
                $img.on("upload", function() {
                    $submit.text("正在上传....");

                    upload(data_url_to_blob(src), function(res) {
                        $submit.text("上传完毕!").css("background-color", "green");

                        $container.fadeOut(function() {
                            $container.remove();
                        });
                    });
                });
                
                $submit.on("click", function() {
                    $img.trigger("upload");
                });

                $cancel.on("click", function() {
                    $container.fadeOut(function() {
                        $container.remove();
                    });
                });
            });
            break;
    }
});

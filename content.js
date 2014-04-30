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
            
            self.$overlay.animate(self.nobg);
            self.resize_overlay();
            self.$selection.css(self.selected);
        }
    });
    
    this.$overlay.on("mouseup", function(event) {
        self.capturing = false;
        self.selected.left = event.clientX - self.selected.width;
        self.selected.top  = event.clientY - self.selected.height;
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

chrome.runtime.onMessage.addListener(function(message) {
    switch(message.task) {
        case "capture":
            Capture.inject(function(src) {
                var $img = jQuery("<img src=\"javascript:void(0);\" id=\"4ye-image-view\">");
                $img = jQuery("#4ye-image-view").length > 0 ? jQuery("#4ye-image-view") : $img.appendTo(jQuery("body"));
                $img.attr("style", "background-color:white;box-shadow:0 0 8px #444;position:fixed;top:0;left:0;bottom:0;right:0;margin:auto;z-index:99999999").hide();
                $img.slideDown(function() {
                    Capture.detach();
                });
                $img.attr("src", src);
            });
            break;
    }
});

jQuery(document).on("click", "#4ye-image-view", function() {
    jQuery(this).fadeOut(function() {
        jQuery(this).remove();
    })
});

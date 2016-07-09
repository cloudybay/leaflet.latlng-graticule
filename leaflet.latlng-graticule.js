/**
 *  Create a Canvas as ImageOverlay to draw the Lat/Lon Graticule,
 *  and show the axis tick label on the edge of the map.
 *  Author: lanwei@cloudybay.com.tw
 */

(function (window, document, undefined) {

L.LatLngGraticule = L.Class.extend({
    includes: L.Mixin.Events,

    options: {
        showLabel: true,
        opacity: 1,
        weight: 0.8,
        color: '#aaa',
        font: '12px Verdana',
        lngLineCurved: 0,
        latLineCurved: 0,
        zoomInterval: [
            {start: 2, end: 2, interval: 40},
            {start: 3, end: 3, interval: 20},
            {start: 4, end: 4, interval: 10},
            {start: 5, end: 7, interval: 5},
            {start: 8, end: 20, interval: 1}
        ]
    },

    initialize: function (options) {
        L.setOptions(this, options);

        var defaultFontName = 'Verdana';
        var _ff = this.options.font.split(' ');
        if (_ff.length < 2) {
            this.options.font += ' ' + defaultFontName;
        }

        if (!this.options.fontColor) {
            this.options.fontColor = this.options.color;
        }

        if (this.options.zoomInterval) {
            if (this.options.zoomInterval.latitude) {
                this.options.latInterval = this.options.zoomInterval.latitude;
                if (!this.options.zoomInterval.longitude) {
                    this.options.lngInterval = this.options.zoomInterval.latitude;
                }
            }
            if (this.options.zoomInterval.longitude) {
                this.options.lngInterval = this.options.zoomInterval.longitude;
                if (!this.options.zoomInterval.latitude) {
                    this.options.latInterval = this.options.zoomInterval.longitude;
                }
            }
            if (!this.options.latInterval) {
                this.options.latInterval = this.options.zoomInterval;
            }
            if (!this.options.lngInterval) {
                this.options.lngInterval = this.options.zoomInterval;
            }
        }
    },

    onAdd: function (map) {
        this._map = map;

        if (!this._canvas) {
            this._initCanvas();
        }

        map._panes.overlayPane.appendChild(this._canvas);

        map.on('viewreset', this._reset, this);
        map.on('move', this._reset, this);
        map.on('moveend', this._reset, this);

        if (map.options.zoomAnimation && L.Browser.any3d) {
            map.on('zoomanim', this._animateZoom, this);
        }

        this._reset();
    },

    onRemove: function (map) {
        map.getPanes().overlayPane.removeChild(this._canvas);

        map.off('viewreset', this._reset, this);
        map.off('move', this._reset, this);
        map.off('moveend', this._reset, this);

        if (map.options.zoomAnimation) {
            map.off('zoomanim', this._animateZoom, this);
        }
    },

    addTo: function (map) {
        map.addLayer(this);
        return this;
    },

    setOpacity: function (opacity) {
        this.options.opacity = opacity;
        this._updateOpacity();
        return this;
    },

    bringToFront: function () {
        if (this._canvas) {
            this._map._panes.overlayPane.appendChild(this._canvas);
        }
        return this;
    },

    bringToBack: function () {
        var pane = this._map._panes.overlayPane;
        if (this._canvas) {
            pane.insertBefore(this._canvas, pane.firstChild);
        }
        return this;
    },

    getAttribution: function () {
        return this.options.attribution;
    },

    _initCanvas: function () {
        this._canvas = L.DomUtil.create('canvas', 'leaflet-image-layer');

        if (this._map.options.zoomAnimation && L.Browser.any3d) {
            L.DomUtil.addClass(this._canvas, 'leaflet-zoom-animated');
        } else {
            L.DomUtil.addClass(this._canvas, 'leaflet-zoom-hide');
        }

        this._updateOpacity();

        L.extend(this._canvas, {
            onselectstart: L.Util.falseFn,
            onmousemove: L.Util.falseFn,
            onload: L.bind(this._onCanvasLoad, this)
        });
    },

    _animateZoom: function (e) {
        var map = this._map,
            canvas = this._canvas,
            scale = map.getZoomScale(e.zoom),
            nw = map.containerPointToLatLng([0, 0]),
            se = map.containerPointToLatLng([canvas.width, canvas.height]),

            topLeft = map._latLngToNewLayerPoint(nw, e.zoom, e.center),
            size = map._latLngToNewLayerPoint(se, e.zoom, e.center)._subtract(topLeft),
            origin = topLeft._add(size._multiplyBy((1 / 2) * (1 - 1 / scale)));

        canvas.style[L.DomUtil.TRANSFORM] =
                L.DomUtil.getTranslateString(origin) + ' scale(' + scale + ') ';
    },

    _reset: function () {
        var canvas = this._canvas,
            size = this._map.getSize(),
            lt = this._map.containerPointToLayerPoint([0, 0]);

        L.DomUtil.setPosition(canvas, lt);

        canvas.width  = size.x;
        canvas.height = size.y;
        canvas.style.width  = size.x + 'px';
        canvas.style.height = size.y + 'px';

        this.__calcInterval();

        this.__draw(true);
    },

    _onCanvasLoad: function () {
        this.fire('load');
    },

    _updateOpacity: function () {
        L.DomUtil.setOpacity(this._canvas, this.options.opacity);
    },

    _latLngToContainerPoint: function(map, latlng) {
        var projectedPoint = map.project(L.latLng(latlng));
        var lp = projectedPoint._subtract(map.getPixelOrigin());
        var cp = map.layerPointToContainerPoint(lp);
        return cp;
    },

    __format_lat: function(lat) {
        if (this.options.latFormatTickLabel) {
            return this.options.latFormatTickLabel(lat);
        }

        // todo: format type of float
        if (lat < 0) {
            return '' + (lat*-1) + 'S';
        }
        else if (lat > 0) {
            return '' + lat + 'N';
        }
        return '' + lat;
    },

    __format_lng: function(lng) {
        if (this.options.lngFormatTickLabel) {
            return this.options.lngFormatTickLabel(lng);
        }

        // todo: format type of float
        if (lng > 180) {
            return '' + (360 - lng) + 'W';
        }
        else if (lng > 0 && lng < 180) {
            return '' + lng + 'E';
        }
        else if (lng < 0 && lng > -180) {
            return '' + (lng*-1) + 'W';
        }
        else if (lng == -180) {
            return '' + (lng*-1);
        }
        else if (lng < -180) {
            return '' + (360 + lng) + 'W';
        }
        return '' + lng;
    },

    __calcInterval: function() {
        var zoom = this._map.getZoom();
        if (this._currZoom != zoom) {
            this._currLngInterval = 0;
            this._currLatInterval = 0;
            this._currZoom = zoom;
        }

        var interv;

        if (!this._currLngInterval) {
            try {
                for (var idx in this.options.lngInterval) {
                    var dict = this.options.lngInterval[idx];
                    if (dict.start <= zoom) {
                        if (dict.end && dict.end >= zoom) {
                            this._currLngInterval = dict.interval;
                            break;
                        }
                    }
                }
            }
            catch(e) {
                this._currLngInterval = 0;
            }
        }

        if (!this._currLatInterval) {
            try {
                for (var idx in this.options.latInterval) {
                    var dict = this.options.latInterval[idx];
                    if (dict.start <= zoom) {
                        if (dict.end && dict.end >= zoom) {
                            this._currLatInterval = dict.interval;
                            break;
                        }
                    }
                }
            }
            catch(e) {
                this._currLatInterval = 0;
            }
        }
    },

    __draw: function(label) {
        function _parse_str_to_int(txt) {
            if (txt.length > 2) {
                if (txt.charAt(txt.length-2) == 'p') {
                    txt = txt.substr(0, txt.length-2);
                }
            }
            try {
                return parseInt(txt, 10);
            }
            catch(e) {}
            return 0;
        };

        var canvas = this._canvas,
            map = this._map,
            curvedLon = this.options.lngLineCurved,
            curvedLat = this.options.latLineCurved;

        if (L.Browser.canvas && map) {
            if (!this._currLngInterval || !this._currLatInterval) {
                this.__calcInterval();
            }

            var latInterval = this._currLatInterval,
                lngInterval = this._currLngInterval;

            var ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = this.options.weight;
            ctx.strokeStyle = this.options.color;
            ctx.fillStyle = this.options.fontColor;

            if (this.options.font) {
                ctx.font = this.options.font;
            }
            var txtWidth = ctx.measureText('0').width;
            var txtHeight = 12;
            try {
                var _font_size = ctx.font.split(' ')[0];
                txtHeight = _parse_str_to_int(_font_size);
            }
            catch(e) {}

            var ww = canvas.width,
                hh = canvas.height;

            var lt = map.containerPointToLatLng(L.point(0, 0));
            var rt = map.containerPointToLatLng(L.point(ww, 0));
            var rb = map.containerPointToLatLng(L.point(ww, hh));

            var _lat_b = parseInt(rb.lat - 1, 10),
                _lat_t = parseInt(lt.lat + 1, 10);
            var _lon_l = parseInt(lt.lng - 1, 10),
                _lon_r = parseInt(rt.lng + 1, 10);

            if (_lat_b < -90) { _lat_b = -90; }
            if (_lat_t > 90) { _lat_t = 90; }

            var ll, latstr, lngstr, _lon_delta = 0.5;
            function __draw_lat_line(self, lat_tick) {
                ll = self._latLngToContainerPoint(map, L.latLng(lat_tick, _lon_l));
                latstr = self.__format_lat(lat_tick);
                txtWidth = ctx.measureText(latstr).width;

                if (curvedLon) {
                    if (typeof(curvedLon) == 'number') {
                        _lon_delta = curvedLon;
                    }

                    ctx.beginPath();
                    ctx.moveTo(ll.x, ll.y);
                    var _prev_p = null;
                    for (var j=_lon_l; j<_lon_r; j+=_lon_delta) {
                        var rr = self._latLngToContainerPoint(map, L.latLng(i, j));
                        ctx.lineTo(rr.x, rr.y);

                        if (self.options.showLabel && label && _prev_p != null) {
                            if (_prev_p.x < 0 && rr.x >= 0) {
                                var _s = (rr.x - 0) / (rr.x - _prev_p.x);
                                var _y = rr.y - ((rr.y - _prev_p.y) * _s);
                                ctx.fillText(latstr, 0, _y + (txtHeight/2));
                            }
                            else if (_prev_p.x <= ww && rr.x > ww) {
                                var _s = (rr.x - ww) / (rr.x - _prev_p.x);
                                var _y = rr.y - ((rr.y - _prev_p.y) * _s);
                                ctx.fillText(latstr, ww-txtWidth, _y + (txtHeight/2)-2);
                            }
                        }

                        _prev_p = {x:rr.x, y:rr.y, lon:j, lat:i};
                    }
                    ctx.stroke();
                }
                else {
                    var rr = map.latLngToContainerPoint(L.latLng(lat_tick, _lon_r));
                    ctx.beginPath();
                    ctx.moveTo(ll.x+1, ll.y);
                    ctx.lineTo(rr.x-1, rr.y);
                    ctx.stroke();
                    if (self.options.showLabel && label) {
                        var _yy = ll.y + (txtHeight/2)-2;
                        ctx.fillText(latstr, 0, _yy);
                        ctx.fillText(latstr, ww-txtWidth, _yy);
                    }
                }
            };

            if (latInterval > 0) {
                for (var i=latInterval; i<=_lat_t; i+=latInterval) {
                    if (i >= _lat_b) {
                        __draw_lat_line(this, i);
                    }
                }
                for (var i=0; i>=_lat_b; i-=latInterval) {
                    if (i <= _lat_t) {
                        __draw_lat_line(this, i);
                    }
                }
            }

            function __draw_lon_line(self, lon_tick) {
                lngstr = self.__format_lng(lon_tick);
                txtWidth = ctx.measureText(lngstr).width;
                var bb = map.latLngToContainerPoint(L.latLng(_lat_b, lon_tick));

                if (curvedLat) {
                    if (typeof(curvedLat) == 'number') {
                        _lat_delta = curvedLat;
                    }

                    ctx.beginPath();
                    ctx.moveTo(bb.x, bb.y);
                    var _prev_p = null;
                    for (var j=_lat_b; j<_lat_t; j+=_lat_delta) {
                        var tt = self._latLngToContainerPoint(map, L.latLng(j, lon_tick));
                        ctx.lineTo(tt.x, tt.y);

                        if (self.options.showLabel && label && _prev_p != null) {
                            if (_prev_p.y > 0 && tt.y <= 0) {
                                ctx.fillText(lngstr, tt.x - (txtWidth/2), txtHeight);
                            }
                            else if (_prev_p.y >= hh && tt.y < hh) {
                                ctx.fillText(lngstr, tt.x - (txtWidth/2), hh-2);
                            }
                        }

                        _prev_p = {x:tt.x, y:tt.y, lon:lon_tick, lat:j};
                    }
                    ctx.stroke();
                }
                else {
                    var tt = map.latLngToContainerPoint(L.latLng(_lat_t, lon_tick));
                    ctx.beginPath();
                    ctx.moveTo(tt.x, tt.y+1);
                    ctx.lineTo(bb.x, bb.y-1);
                    ctx.stroke();

                    if (self.options.showLabel && label) {
                        ctx.fillText(lngstr, tt.x - (txtWidth/2), txtHeight+1);
                        ctx.fillText(lngstr, bb.x - (txtWidth/2), hh-3);
                    }
                }
            };

            if (lngInterval > 0) {
                for (var i=lngInterval; i<=_lon_r; i+=lngInterval) {
                    if (i >= _lon_l) {
                        __draw_lon_line(this, i);
                    }
                }
                for (var i=0; i>=_lon_l; i-=lngInterval) {
                    if (i <= _lon_r) {
                        __draw_lon_line(this, i);
                    }
                }
            }
        }
    }

});

L.latlngGraticule = function (options) {
    return new L.LatLngGraticule(options);
};


}(this, document));

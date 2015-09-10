'use strict';

/**
 * Render config object used by browser's StreamGL library to configure WebGL + streaming. Sent via
 * XHR or WebSocket to the browser by the server in response to API call.
 */

var fs = require('fs');
var _ = require('underscore');

var log         = require('common/logger.js');
var logger      = log.createLogger('graph-viz:driver:config');


var STROKE_WIDTH = 4.0;

var programs = {
    'edgeculled': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/edgeculled.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/edgeculled.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['edgeColor', 'curPos'],
        'camera': 'mvp',
        'uniforms': ['edgeOpacity']
    },
    'edgehighlight': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/edgehighlighted.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/edgehighlighted.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['curPos'],
        'camera': 'mvp',
        'uniforms': []
    },
    'arrow': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/arrow.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/arrow.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['startPos', 'endPos', 'normalDir', 'arrowColor', 'pointSize'],
        'camera': 'mvp',
        'uniforms': ['zoomScalingFactor', 'maxPointSize', 'maxScreenSize', 'maxCanvasSize', 'edgeOpacity']
    },
    'arrowhighlight': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/arrowhighlighted.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/arrowhighlighted.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['startPos', 'endPos', 'normalDir', 'pointSize', 'arrowColor'],
        'camera': 'mvp',
        'uniforms': ['zoomScalingFactor', 'maxPointSize', 'maxScreenSize', 'maxCanvasSize']
    },
    'edges': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/edge.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/edge.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['edgeColor', 'curPos'],
        'camera': 'mvp',
        'uniforms': []
    },
    'midedges': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/midedge.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/midedge.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['curPos'],
        'camera': 'mvp',
        'uniforms': []
    },
    'midedgeculled': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/midedgeculled.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/midedgeculled.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['curPos', 'edgeColor', 'startPos', 'endPos'],
        'camera': 'mvp',
        'uniforms': ['edgeOpacity', 'isOpaque']
    },
    'pointculled': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/pointculled.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/pointculled.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['curPos', 'pointSize', 'pointColor'],
        'camera': 'mvp',
        'uniforms': ['fog', 'stroke', 'zoomScalingFactor', 'maxPointSize', 'minPointSize', 'pointOpacity']
    },
    'pointhighlight': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/pointhighlighted.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/pointhighlighted.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['curPos', 'pointSize', 'pointColor'],
        'camera': 'mvp',
        'uniforms': ['fog', 'stroke', 'zoomScalingFactor', 'maxPointSize', 'minPointSize', 'pointOpacity']
    },
    'points': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/point.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/point.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['curPos', 'pointSize', 'pointColor'],
        'camera': 'mvp',
        'uniforms': ['zoomScalingFactor', 'maxPointSize']
    },
    'midpoints': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/midpoint.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/midpoint.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['curPos'],
        'camera': 'mvp',
        'uniforms': []
    },
    'fullscreen': {
        'sources': {
            'vertex': fs.readFileSync(__dirname + '/../shaders/fullscreen.vertex.glsl', 'utf8').toString('ascii'),
            'fragment': fs.readFileSync(__dirname + '/../shaders/fullscreen.fragment.glsl', 'utf8').toString('ascii')
        },
        'attributes': ['vertexPosition'],
        'camera': 'mvp',
        'uniforms': ['flipTexture'],
        'textures': ['uSampler']
    }

}

/* datasource can be either SERVER or CLIENT */

var VBODataSources = {
    DEVICE: 'DEVICE', // OpenCL server buffer
    HOST: 'HOST',     // Plain server buffer
    CLIENT: 'CLIENT', // Client-computed buffer
    SERVER: 'SERVER'
};


var DrawOptions = {
    DYNAMIC_DRAW: 'DYNAMIC_DRAW',
    STATIC_DRAW: 'STATIC_DRAW'
};


var textures = {
    'hitmap': {
        'datasource': VBODataSources.CLIENT,
        'width': {'unit': 'percent', 'value': 25},
        'height': {'unit': 'percent', 'value': 25}
    },
    'pointTexture': {
        'datasource': VBODataSources.CLIENT,
        'retina': true
    },
    'steadyStateTexture': {
        'datasource': VBODataSources.CLIENT,
        'retina': true
    },
    'pointHitmapDownsampled': {
        'datasource': VBODataSources.CLIENT,
        'width': {'unit': 'percent', 'value': 5},
        'height': {'unit': 'percent', 'value': 5}
    },
    'colorMap': {
        'datasource': VBODataSources.SERVER,
        'path': 'test-colormap2.png'
    }
};


/**
 * These represent different kinds/roles of VBOs.
 *
 * datasource can be:
 * DEVICE -> OpenCL server buffer
 * HOST   -> plain server buffer
 * CLIENT -> computed on client
 */
var models = {
    'logicalEdges': {
        'curIdx': {
            'datasource': VBODataSources.HOST,
            'index': true,
            'type': 'UNSIGNED_INT',
            'hint': DrawOptions.STATIC_DRAW,
            'count': 1,
            'offset': 0,
            'stride': 0,
            'normalize': false
        }
    },
    'forwardsEdgeStartEndIdxs': {
        'curIdx': {
            'datasource': VBODataSources.HOST,
            'index': true,
            'type': 'UNSIGNED_INT',
            'hint': DrawOptions.STATIC_DRAW,
            'count': 1,
            'offset': 0,
            'stride': 0,
            'normalize': false
        }
    },
    'backwardsEdgeStartEndIdxs': {
        'curIdx': {
            'datasource': VBODataSources.HOST,
            'index': true,
            'type': 'UNSIGNED_INT',
            'hint': DrawOptions.STATIC_DRAW,
            'count': 1,
            'offset': 0,
            'stride': 0,
            'normalize': false
        }
    },
    'midSpringsPos': {
        'curPos': {
            'datasource': VBODataSources.CLIENT,
            'type': 'FLOAT',
            'hint': DrawOptions.DYNAMIC_DRAW,
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'midSpringsStarts': {
        'startPos': {
            'datasource': 'CLIENT',
            'type': 'FLOAT',
            'hint': 'DYNAMIC_DRAW',
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'midSpringsEnds': {
        'endPos': {
            'datasource': 'CLIENT',
            'type': 'FLOAT',
            'hint': 'DYNAMIC_DRAW',
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'highlightedEdgesPos': {
        'curPos': {
            'datasource': VBODataSources.CLIENT,
            'type': 'FLOAT',
            'hint': DrawOptions.DYNAMIC_DRAW,
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'arrowStartPos': {
        'curPos': {
            'datasource': VBODataSources.CLIENT,
            'type': 'FLOAT',
            'hint': DrawOptions.DYNAMIC_DRAW,
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'arrowEndPos': {
        'curPos': {
            'datasource': VBODataSources.CLIENT,
            'type': 'FLOAT',
            'hint': DrawOptions.DYNAMIC_DRAW,
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'arrowNormalDir': {
        'normalDir': {
            'datasource': VBODataSources.CLIENT,
            'type': 'FLOAT',
            'hint': DrawOptions.DYNAMIC_DRAW,
            'count': 1,
            'offset': 0,
            'stride': 0,
            'normalize': false
        }
    },
    'highlightedArrowStartPos': {
        'curPos': {
            'datasource': VBODataSources.CLIENT,
            'type': 'FLOAT',
            'hint': DrawOptions.DYNAMIC_DRAW,
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'highlightedArrowEndPos': {
        'curPos': {
            'datasource': VBODataSources.CLIENT,
            'type': 'FLOAT',
            'hint': DrawOptions.DYNAMIC_DRAW,
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'highlightedArrowNormalDir': {
        'normalDir': {
            'datasource': VBODataSources.CLIENT,
            'type': 'FLOAT',
            'hint': DrawOptions.DYNAMIC_DRAW,
            'count': 1,
            'offset': 0,
            'stride': 0,
            'normalize': false
        }
    },
    'curPoints': {
        'curPos': {
            'datasource': VBODataSources.DEVICE,
            'type': 'FLOAT',
            'count': 2,
            'hint': DrawOptions.DYNAMIC_DRAW,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'highlightedPointsPos': {
        'curPos': {
            'datasource': VBODataSources.CLIENT,
            'type': 'FLOAT',
            'hint': DrawOptions.DYNAMIC_DRAW,
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'highlightedPointsSizes': {
        'pointSize': {
            'datasource': VBODataSources.CLIENT,
            'type': 'UNSIGNED_BYTE',
            'hint': DrawOptions.DYNAMIC_DRAW,
            'count': 1,
            'offset': 0,
            'stride': 0,
            'normalize': false
        }
    },
    'highlightedPointsColors': {
        'pointColor': {
            'datasource': VBODataSources.CLIENT,
            'type': 'UNSIGNED_BYTE',
            'hint': DrawOptions.DYNAMIC_DRAW,
            'count': 4,
            'offset': 0,
            'stride': 0,
            'normalize': true
        }
    },
    'pointSizes': {
        'pointSize':  {
            'datasource': VBODataSources.HOST,
            'type': 'UNSIGNED_BYTE',
            'hint': DrawOptions.STATIC_DRAW,
            'count': 1,
            'offset': 0,
            'stride': 0,
            'normalize': false
        }
    },
    'edgeHeights': {
        'edgeHeight':  {
            'datasource': 'HOST',
            'type': 'FLOAT',
            'hint': 'STATIC_DRAW',
            'count': 1,
            'offset': 0,
            'stride': 0,
            'normalize': true
        }
    },
    'arrowPointSizes': {
        'pointSize':  {
            'datasource': VBODataSources.CLIENT,
            'type': 'UNSIGNED_BYTE',
            'hint': DrawOptions.STATIC_DRAW,
            'count': 1,
            'offset': 0,
            'stride': 0,
            'normalize': false
        }
    },
    'highlightedArrowPointSizes': {
        'pointSize':  {
            'datasource': VBODataSources.CLIENT,
            'type': 'UNSIGNED_BYTE',
            'hint': DrawOptions.DYNAMIC_DRAW,
            'count': 1,
            'offset': 0,
            'stride': 0,
            'normalize': false
        }
    },
    'highlightedArrowPointColors': {
        'arrowColor':  {
            'datasource': VBODataSources.CLIENT,
            'type': 'UNSIGNED_BYTE',
            'hint': DrawOptions.DYNAMIC_DRAW,
            'count': 4,
            'offset': 0,
            'stride': 0,
            'normalize': true
        }
    },
    'edgeColors': {
        'edgeColor':  {
            'datasource': VBODataSources.HOST,
            'type': 'UNSIGNED_BYTE',
            'hint': DrawOptions.STATIC_DRAW,
            'count': 4,
            'offset': 0,
            'stride': 0,
            'normalize': true
        }
    },
    //GIS
    'midEdgeColors': {
        'midEdgeColor':  {
            'datasource': VBODataSources.HOST,
            'type': 'UNSIGNED_BYTE',
            'hint': DrawOptions.STATIC_DRAW,
            'count': 4,
            'offset': 0,
            'stride': 0,
            'normalize': true
        }
    },
    'midEdgesColors': {
        'midEdgeColor':  {
            'datasource': VBODataSources.CLIENT,
            'type': 'UNSIGNED_BYTE',
            'hint': DrawOptions.STATIC_DRAW,
            'count': 4,
            'offset': 0,
            'stride': 0,
            'normalize': true
        }
    },
    'arrowColors': {
        'arrowColor':  {
            'datasource': VBODataSources.CLIENT,
            'type': 'UNSIGNED_BYTE',
            'hint': DrawOptions.STATIC_DRAW,
            'count': 4,
            'offset': 0,
            'stride': 0,
            'normalize': true
        }
    },
    'pointColors': {
        'pointColor':  {
            'datasource': VBODataSources.HOST,
            'type': 'UNSIGNED_BYTE',
            'hint': DrawOptions.STATIC_DRAW,
            'count': 4,
            'offset': 0,
            'stride': 0,
            'normalize': true
        }
    },
    'curMidPoints': {
        'curPos': {
            'datasource': VBODataSources.DEVICE,
            'type': 'FLOAT',
            'hint': DrawOptions.DYNAMIC_DRAW,
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'curMidPointsClient': {
        'curPos': {
            'datasource': VBODataSources.CLIENT,
            'type': 'FLOAT',
            'hint': DrawOptions.DYNAMIC_DRAW,
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'fullscreenCoordinates': {
        'vertexPosition': {
            'datasource': VBODataSources.CLIENT,
            'type': 'FLOAT',
            'count': 2,
            'offset': 0,
            'stride': 8,
            'normalize': false
        }
    },
    'vertexIndices': {
        'pointColor': {
            'datasource': 'VERTEX_INDEX',
            'type': 'UNSIGNED_BYTE',
            'count': 4,
            'offset': 0,
            'stride': 0,
            'normalize': true
        }
    },
    'edgeIndices': {
        'edgeColor': {
            'datasource': 'EDGE_INDEX',
            'type': 'UNSIGNED_BYTE',
            'hint': DrawOptions.STATIC_DRAW,
            'count': 4,
            'offset': 0,
            'stride': 0,
            'normalize': true
        }
    }
}

var pointCulledUniforms = {
    'fog': { 'uniformType': '1f', 'defaultValues': [10.0] },
    'pointOpacity': { 'uniformType': '1f', 'defaultValues': [0.8] },
    'stroke': { 'uniformType': '1f', 'defaultValues': [-STROKE_WIDTH] },
    'zoomScalingFactor': { 'uniformType': '1f', 'defaultValues': [1.0] },
    'maxPointSize': { 'uniformType': '1f', 'defaultValues': [50.0] },
    'minPointSize': { 'uniformType': '1f', 'defaultValues': [8.0] }
}

var pickingGlOpts = {
    'clearColor': [[1, 1, 1, 0.0]],
    'blendFuncSeparate': [['SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA', 'ONE', 'ONE']],
    'blendEquationSeparate': [['FUNC_ADD', 'FUNC_ADD']],
};

var items = {
    'indexeddummy' : {
        'program': 'edgeculled',
        'triggers': [],
        'bindings': {
            'curPos': ['curPoints', 'curPos'],
            'edgeColor': ['edgeColors', 'edgeColor']
        },
        'uniforms': {
            'edgeOpacity': { 'uniformType': '1f', 'defaultValues': [1.0] }
        },
        'index': ['logicalEdges', 'curIdx'],
        'drawType': 'LINES',
        'glOptions': {}
    },
    'indexeddummy2' : {
        'program': 'midedgeculled',
        'triggers': [],
        'bindings': {
            //'curPos': ['curMidPointsClient', 'curPos'],
            'curPos': ['curMidPoints', 'curPos'],
            'edgeColor': ['edgeColors', 'edgeColor'],
            'startPos': ['midSpringsStarts', 'startPos'],
            'endPos': ['midSpringsEnds', 'endPos']
        },
        'uniforms': {
            'edgeOpacity': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'isOpaque': { 'uniformType': '1f', 'defaultValues': [0.0] }
        },
        'index': ['logicalEdges', 'curIdx'],
        'drawType': 'LINES',
        'glOptions': {}
    },
    'indexeddummyForwardsEdgeIdxs1' : {
        'program': 'edgeculled',
        'triggers': [],
        'bindings': {
            'curPos': ['curPoints', 'curPos'],
            'edgeColor': ['edgeColors', 'edgeColor']
        },
        'uniforms': {
            'edgeOpacity': { 'uniformType': '1f', 'defaultValues': [1.0] }
        },
        'index': ['forwardsEdgeStartEndIdxs', 'curIdx'],
        'drawType': 'LINES',
        'glOptions': {}
    },
    'indexeddummyForwardsEdgeIdxs2' : {
        'program': 'midedgeculled',
        'triggers': [],
        'bindings': {
            //'curPos': ['curMidPointsClient', 'curPos'],
            'curPos': ['curMidPoints', 'curPos'],
            'edgeColor': ['edgeColors', 'edgeColor'],
            'startPos': ['midSpringsStarts', 'startPos'],
            'endPos': ['midSpringsEnds', 'endPos']
        },
        'uniforms': {
            'edgeOpacity': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'isOpaque': { 'uniformType': '1f', 'defaultValues': [0.0] }
        },
        'index': ['forwardsEdgeStartEndIdxs', 'curIdx'],
        'drawType': 'LINES',
        'glOptions': {}
    },
    'indexeddummyBackwardsEdgeIdxs1' : {
        'program': 'edgeculled',
        'triggers': [],
        'bindings': {
            'curPos': ['curPoints', 'curPos'],
            'edgeColor': ['edgeColors', 'edgeColor']
        },
        'uniforms': {
            'edgeOpacity': { 'uniformType': '1f', 'defaultValues': [1.0] }
        },
        'index': ['backwardsEdgeStartEndIdxs', 'curIdx'],
        'drawType': 'LINES',
        'glOptions': {}
    },
    'indexeddummyBackwardsEdgeIdxs2' : {
        'program': 'midedgeculled',
        'triggers': [],
        'bindings': {
            //'curPos': ['curMidPointsClient', 'curPos'],
            'curPos': ['curMidPoints', 'curPos'],
            'edgeColor': ['edgeColors', 'edgeColor'],
            'startPos': ['midSpringsStarts', 'startPos'],
            'endPos': ['midSpringsEnds', 'endPos']
        },
        'uniforms': {
            'edgeOpacity': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'isOpaque': { 'uniformType': '1f', 'defaultValues': [0.0] }
        },
        'index': ['backwardsEdgeStartEndIdxs', 'curIdx'],
        'drawType': 'LINES',
        'glOptions': {}
    },
    'uberdemoedges' : {
        'program': 'midedgeculled',
        'triggers': ['renderSceneFull'],
        'bindings': {
            'curPos': ['midSpringsPos', 'curPos'],
            'edgeColor': ['midEdgeColors', 'midEdgeColor'],
            'startPos': ['midSpringsStarts', 'startPos'],
            'endPos': ['midSpringsEnds', 'endPos']
        },
        'uniforms': {
            'edgeOpacity': { 'uniformType': '1f', 'defaultValues': [0.2] },
            'isOpaque': { 'uniformType': '1f', 'defaultValues': [0.0] }
        },
        'drawType': 'LINES',
        'glOptions': {}
    },
    'dummyheights': {
        'program': 'edgeculled',
        'triggers': [],
        'bindings': {
            'curPos': ['curMidPoints', 'curPos'],
            'edgeColor': ['edgeHeights', 'edgeHeight']
        },
        'uniforms': {
            'edgeOpacity': { 'uniformType': '1f', 'defaultValues': [1.0] }
        },
        'drawType': 'LINES',
        'glOptions': {}
    },
    'midedgeculled' : {
        'program': 'midedgeculled',
        'triggers': ['renderSceneFull'],
        'bindings': {
            'curPos': ['midSpringsPos', 'curPos'],
            'edgeColor': ['midEdgesColors', 'midEdgeColor'],
            'startPos': ['midSpringsStarts', 'startPos'],
            'endPos': ['midSpringsEnds', 'endPos']
        },
        'uniforms': {
            'edgeOpacity': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'isOpaque': { 'uniformType': '1f', 'defaultValues': [0.0] }
        },
        'drawType': 'LINES',
        'glOptions': {}
    },
    'edgehighlight': {
        'program': 'edgehighlight',
        'triggers': ['highlight'],
        'bindings': {
            'curPos': ['highlightedEdgesPos', 'curPos']
        },
        'drawType': 'LINES',
        'glOptions': {
            'depthFunc': [['LESS']]
        }
    },
    'arrowculled' : {
        'program': 'arrow',
        'triggers': ['renderSceneFull'],
        'bindings': {
            'startPos': ['arrowStartPos', 'curPos'],
            'endPos': ['arrowEndPos', 'curPos'],
            'normalDir': ['arrowNormalDir', 'normalDir'],
            'arrowColor': ['arrowColors', 'arrowColor'],
            'pointSize': ['arrowPointSizes', 'pointSize'],
        },
        'uniforms': {
            'edgeOpacity': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'zoomScalingFactor': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'maxPointSize': { 'uniformType': '1f', 'defaultValues': [50.0] },
            'maxScreenSize': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'maxCanvasSize': { 'uniformType': '1f', 'defaultValues': [1.0] }
        },
        'drawType': 'TRIANGLES',
        'glOptions': {
            //'depthFunc': [['LESS']]
        }
    },
    'arrowhighlight' : {
        'program': 'arrowhighlight',
        'triggers': ['highlight'],
        'bindings': {
            'startPos': ['highlightedArrowStartPos', 'curPos'],
            'endPos': ['highlightedArrowEndPos', 'curPos'],
            'normalDir': ['highlightedArrowNormalDir', 'normalDir'],
            'arrowColor': ['highlightedArrowPointColors', 'arrowColor'],
            'pointSize': ['highlightedArrowPointSizes', 'pointSize'],
        },
        'uniforms': {
            'zoomScalingFactor': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'maxPointSize': { 'uniformType': '1f', 'defaultValues': [50.0] },
            'maxScreenSize': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'maxCanvasSize': { 'uniformType': '1f', 'defaultValues': [1.0] }
        },
        'drawType': 'TRIANGLES',
        'glOptions': {
            //'depthFunc': [['LESS']]
        }
    },
    'edgepicking': {
        'program': 'midedgeculled',
        'triggers': ['picking'],
        'bindings': {
            'curPos': ['midSpringsPos', 'curPos'],
            'startPos': ['midSpringsStarts', 'startPos'],
            'endPos': ['midSpringsEnds', 'endPos'],
            'edgeColor': ['edgeIndices', 'edgeColor']
        },
        'uniforms': {
            'edgeOpacity': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'isOpaque': { 'uniformType': '1f', 'defaultValues': [1.0] }
        },
        'drawType': 'LINES',
        'glOptions': pickingGlOpts,
        'renderTarget': 'hitmap',
        'readTarget': true
    },
    'pointculled': {
        'program': 'pointculled',
        'triggers': ['renderSceneFast', 'renderSceneFull'],
        'bindings': {
            'curPos':       ['curPoints', 'curPos'],
            'pointSize':    ['pointSizes', 'pointSize'],
            'pointColor':   ['pointColors', 'pointColor'],
        },
        'uniforms': pointCulledUniforms,
        'drawType': 'POINTS',
        'glOptions': {},
    },
    'pointhighlight': {
        'program': 'pointhighlight',
        'triggers': ['highlight'],
        'bindings': {
            'curPos':       ['highlightedPointsPos', 'curPos'],
            'pointSize':    ['highlightedPointsSizes', 'pointSize'],
            'pointColor':   ['highlightedPointsColors', 'pointColor'],
        },
        'uniforms': pointCulledUniforms,
        'drawType': 'POINTS',
        'glOptions': {}
    },
    'uberpointculled': {
        'program': 'pointculled',
        'triggers': ['renderSceneFast', 'renderSceneFull'],
        'bindings': {
            'curPos':       ['curPoints', 'curPos'],
            'pointSize':    ['pointSizes', 'pointSize'],
            'pointColor':   ['pointColors', 'pointColor'],
        },
        'uniforms': {
            'fog': { 'uniformType': '1f', 'defaultValues': [10.0] },
            'pointOpacity': { 'uniformType': '1f', 'defaultValues': [0.4] },
            'stroke': { 'uniformType': '1f', 'defaultValues': [-STROKE_WIDTH] },
            'zoomScalingFactor': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'maxPointSize': { 'uniformType': '1f', 'defaultValues': [50.0] },
            'minPointSize': { 'uniformType': '1f', 'defaultValues': [8.0] }
        },
        'drawType': 'POINTS',
        'glOptions': {},
    },
    'pointculledtexture': {
        'program': 'pointculled',
        'triggers': ['marquee'],
        'bindings': {
            'curPos':       ['curPoints', 'curPos'],
            'pointSize':    ['pointSizes', 'pointSize'],
            'pointColor':   ['pointColors', 'pointColor']
        },
        'uniforms': pointCulledUniforms,
        'drawType': 'POINTS',
        'glOptions': {'clearColor': [[1, 1, 1, 0.0]] },
        'renderTarget': 'pointTexture',
        'readTarget': true,
    },
    'pointoutline': {
        'program': 'pointculled',
        'triggers': ['renderSceneFull'],
        'bindings': {
            'curPos':       ['curPoints', 'curPos'],
            'pointSize':    ['pointSizes', 'pointSize'],
            'pointColor':   ['pointColors', 'pointColor']
        },
        'uniforms': _.extend({}, pointCulledUniforms, {
            'stroke': { 'uniformType': '1f', 'defaultValues': [STROKE_WIDTH]}
        }),
        'drawType': 'POINTS',
        'glOptions': {},
    },
    'pointoutlinetexture': {
        'program': 'pointculled',
        'triggers': ['marquee'],
        'bindings': {
            'curPos':       ['curPoints', 'curPos'],
            'pointSize':    ['pointSizes', 'pointSize'],
            'pointColor':   ['pointColors', 'pointColor'],
        },
        'uniforms': _.extend({}, pointCulledUniforms, {
            'stroke': { 'uniformType': '1f', 'defaultValues': [STROKE_WIDTH]}
        }),
        'drawType': 'POINTS',
        'glOptions': {'clearColor': [[1, 1, 1, 0.0]] },
        'renderTarget': 'pointTexture',
        'readTarget': false
    },
    'pointpicking': {
        'program': 'points',
        'triggers': ['picking'],
        'bindings': {
            'curPos':       ['curPoints', 'curPos'],
            'pointSize':    ['pointSizes', 'pointSize'],
            'pointColor':   ['vertexIndices', 'pointColor']
        },
        'uniforms': {
            'zoomScalingFactor': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'maxPointSize': { 'uniformType': '1f', 'defaultValues': [50.0] }
        },
        'drawType': 'POINTS',
        'glOptions': pickingGlOpts,
        'renderTarget': 'hitmap',
        'readTarget': true,
    },
    'pointsampling': {
        'program': 'points',
        'triggers': ['picking'],
        'bindings': {
            'curPos':       ['curPoints', 'curPos'],
            'pointSize':    ['pointSizes', 'pointSize'],
            'pointColor':   ['vertexIndices', 'pointColor']
        },
        'uniforms': {
            'zoomScalingFactor': { 'uniformType': '1f', 'defaultValues': [1.0] },
            'maxPointSize': { 'uniformType': '1f', 'defaultValues': [50.0] }
        },
        'drawType': 'POINTS',
        'glOptions': pickingGlOpts,
        'renderTarget': 'pointHitmapDownsampled',
        'readTarget': true,
    },
    'midpoints': {
        'program': 'midpoints',
        'triggers': ['renderSceneFast', 'renderSceneFull'],
        'bindings': {
            'curPos': ['curMidPoints', 'curPos']
        },
        'drawType': 'POINTS',
        'glOptions': {}
    },
    'fullscreen': {
        'program': 'fullscreen',
        'triggers': ['highlight'],
        'bindings': {
            'vertexPosition': ['fullscreenCoordinates', 'vertexPosition']
        },
        'textureBindings': {
            'uSampler': 'steadyStateTexture'
        },
        'uniforms': {
            'flipTexture': { 'uniformType': '1f', 'defaultValues': [1.0] }
        },
        'drawType': 'TRIANGLES',
        'glOptions': {}
    },
    // Because we can't tell renderer to make a texture unless we write to it in an item
    // TODO: Add this functionality and kill fullscreenDummy
    'fullscreenDummy': {
        'program': 'fullscreen',
        'triggers': [],
        'bindings': {
            'vertexPosition': ['fullscreenCoordinates', 'vertexPosition']
        },
        'textureBindings': {
            'uSampler': 'steadyStateTexture'
        },
        'uniforms': {
            'flipTexture': { 'uniformType': '1f', 'defaultValues': [1.0] }
        },
        'drawType': 'TRIANGLES',
        'glOptions': {},
        'renderTarget': 'steadyStateTexture',
        'readTarget': true
    }
}

var stdOptions = {
    'enable': [['BLEND'], ['DEPTH_TEST']],
    'disable': [['CULL_FACE']],
    'blendFuncSeparate': [['SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA', 'ONE', 'ONE']],
    'blendEquationSeparate': [['FUNC_ADD', 'FUNC_ADD']],
    'depthFunc': [['LEQUAL']],
    'clearColor': [[51/255, 51/255, 57/255, 1.0]],
    'lineWidth': [[1]]
};

var transparentOptions =
    _.extend({},
        stdOptions,
        {'clearColor': [[51/255, 51/255, 57/255, 0.0]]});


var camera2D = {
    'type': '2d',
    //'bounds': 'CANVAS', // Use runtime dimensions of canvas element
    'bounds': {'top': -1, 'left': 0, 'bottom': 0, 'right': 1},
    'nearPlane': -1,
    'farPlane': 10
}

var sceneGis = {
    'options': stdOptions,
    'camera': camera2D,
    'clientMidEdgeInterpolation': false,
    //'numRenderedSplits':7 ,
    'render': ['pointpicking',  'pointsampling', 'uberdemoedges', 'edgepicking', 'arrowculled', 'arrowhighlight',
        'uberpointculled', 'edgehighlight', 'fullscreen', 'fullscreenDummy', 'pointhighlight', 'dummyheights',
    'indexeddummy', 'indexeddummy2', 'indexeddummyForwardsEdgeIdxs1', 'indexeddummyForwardsEdgeIdxs2',
    'indexeddummyBackwardsEdgeIdxs1', 'indexeddummyBackwardsEdgeIdxs2']
}

var sceneArcs = {
    'options': stdOptions,
    'camera': camera2D,
    'numRenderedSplits': 8,
    'clientMidEdgeInterpolation': true,
    'arcHeight': 0.2,
    'render': ['pointpicking',  'pointsampling', 'pointoutlinetexture', 'pointculledtexture',
    'midedgeculled', 'edgepicking', 'dummyheights',
    'arrowculled', 'arrowhighlight', 'edgehighlight',
    'pointoutline', 'pointculled', 'fullscreen', 'fullscreenDummy', 'pointhighlight',
    'indexeddummy', 'indexeddummy2', 'indexeddummyForwardsEdgeIdxs1', 'indexeddummyForwardsEdgeIdxs2',
    'indexeddummyBackwardsEdgeIdxs1', 'indexeddummyBackwardsEdgeIdxs2']
};

var sceneTransparent = {
    'options': transparentOptions,
    'camera': camera2D,
    'numRenderedSplits': 8,
    'clientMidEdgeInterpolation': true,
    'arcHeight': 0.2,
    'render': ['pointpicking',  'pointsampling', 'pointoutlinetexture', 'pointculledtexture',
    'midedgeculled', 'edgepicking', 'dummyheights',
    'arrowculled', 'arrowhighlight', 'edgehighlight',
    'pointoutline', 'pointculled', 'fullscreen', 'fullscreenDummy', 'pointhighlight',
    'indexeddummy', 'indexeddummy2', 'indexeddummyForwardsEdgeIdxs1', 'indexeddummyForwardsEdgeIdxs2',
    'indexeddummyBackwardsEdgeIdxs1', 'indexeddummyBackwardsEdgeIdxs2']
};

var sceneStraight = {
    'options': stdOptions,
    'camera': camera2D,
    'numRenderedSplits': 0,
    'clientMidEdgeInterpolation': true,
    'render': ['pointpicking',  'pointsampling', 'pointoutlinetexture', 'pointculledtexture',
    'midedgeculled', 'edgepicking',
    'arrowculled', 'arrowhighlight', 'edgehighlight',
    'pointoutline', 'pointculled', 'fullscreen', 'fullscreenDummy', 'pointhighlight',
    'indexeddummy', 'indexeddummy2', 'indexeddummyForwardsEdgeIdxs1', 'indexeddummyForwardsEdgeIdxs2',
    'indexeddummyBackwardsEdgeIdxs1', 'indexeddummyBackwardsEdgeIdxs2']
}

var scenes = {
    'default': sceneArcs,
    'transparent': sceneTransparent,
    'gis' : sceneGis,
    'netflowStraight': sceneStraight
}

function saneProgram(program, progName) {
    _.each(['sources', 'attributes', 'camera', 'uniforms'], function (field) {
        if (!(field in program))
            logger.die('Program "%s" must have field "%s"', progName, field);
    });
}

function saneTexture(texture, texName) {
    _.each(['datasource'], function (field) {
        if (!(field in texture))
            logger.die('Texture "%s" must have field "%s"', texName, field);
    });
}

function saneModel(model, modName) {
    _.each(model, function (buffer, bufName) {
        _.each(['datasource', 'type', 'count', 'offset', 'stride', 'normalize'], function (field) {
            if (!(field in buffer))
                logger.die('Buffer "%s" in model "%s" must have field "%s"', bufName, modName, field);
        });
    });
}

function saneItem(programs, textures, models, item, itemName) {
    _.each(['program', 'bindings', 'drawType', 'glOptions'], function (field) {
        if (!(field in item))
            logger.die('Item "%s" must have field "%s"', itemName, field);
    });

    if ('renderTarget' in item)
        if (!('readTarget' in item))
            logger.die('Item "%s" must specify readTarget with renderTarget', itemName);

    var progName = item.program;
    if (!(progName in programs))
        logger.die('In item "%s", undeclared program "%s"', itemName, progName);
    var program = programs[progName];

    if (program.textures) {
        _.each(program.textures, function (texName){
            if (!item.textureBindings)
                logger.die('Item "%s", must have textureBindings for program "%s"',
                        itemName, progName);
            if (!_.contains(_.keys(item.textureBindings), texName))
                logger.die('In item "%s", no bindings for texture "%s" (of program "%s")',
                        itemName, texName, progName);
        });
        _.each(item.textureBindings, function (texName, texPname) {
            if (!_.contains(program.textures, texPname))
                logger.die('Program "%s" does not declare texture named "%s" bound by item "%s"',
                        progName, texPname, itemName);
            if (!(texName in textures))
                logger.die('In item "%s", undeclared texture "%s"', itemName, texName);
        });
    }

    _.each(program.uniforms, function (uniform) {
        if (!(item.uniforms) || !(uniform in item.uniforms))
            logger.die('Item "%s" does not bind uniform "%s"', itemName, uniform);
    });

    _.each(item.uniforms, function (binding, uniform) {
        if (!_.contains(program.uniforms, uniform))
            logger.die('Item "%s" binds uniform "%s" not declared by program "%s"',
                     itemName, uniform, progName)
    })

    _.each(program.attributes, function (attr) {
        if (!(attr in item.bindings))
            logger.die('In item "%s", program attribute "%s" (of program "%s") is not bound',
                    itemName, progName, attr);
    });
    _.each(item.bindings, function (modelNames, attr) {
        if (!_.contains(program.attributes, attr))
            logger.die('Program %s does not declare attribute %s bound by item %s',
                        progName, attr, itemName);
        if (!(modelNames[0] in models) || !(modelNames[1] in models[modelNames[0]]))
            logger.die('In item "%s", undeclared model "%s"', itemName, modelNames);
    });

    if (item.renderTarget) {
        var texName = item.renderTarget;
        if (!_.contains(_.keys(textures), texName))
            logger.die('In item "%s", underclared renderTarget texture "%s"', itemName, texName);
    }
}

function saneScene(items, scene, sceneName) {
    _.each(['options', 'camera', 'render'], function (field) {
        if (!(field in scene))
            logger.die('Scene "%s", must have field "%s"', sceneName, field);
    });

    _.each(scene.render, function (itemName) {
        if (!(itemName in items))
            logger.die('In scene "%s", undeclared render item "%s"', sceneName, itemName);
    });
}

function check(programs, textures, models, items, scenes) {
    _.each(programs, saneProgram);
    _.each(textures, saneTexture);
    _.each(models, saneModel);
    _.each(items, saneItem.bind('', programs, textures, models));
    _.each(scenes, saneScene.bind('', items));
}

function generateAllConfigs(programs, textures, models, items, scenes) {
    check(programs, textures, models, items, scenes);

    return _.object(_.map(scenes, function (scene, name) {
        var config = _.extend({}, scene);

        var citems = {}
        var cprograms = {};
        var cmodels = {};
        var ctextures = {};

        _.each(scene.render, function (itemName) {
            var item = items[itemName];
            citems[itemName] = item;

            var progName = item.program;
            var program = programs[progName];
            cprograms[progName] = program;

            if (program.textures) {
                _.each(item.textureBindings, function (texName, texPname) {
                    ctextures[texName] = textures[texName];
                })
            }

            _.each(item.bindings, function (modelNames, attr) {
                var model = models[modelNames[0]][modelNames[1]];
                var wrapper = {};
                wrapper[modelNames[1]] = model;
                cmodels[modelNames[0]] = wrapper;
            })

            if (item.index) {
                var modelNames = item.index;
                var model = models[modelNames[0]][modelNames[1]];
                var wrapper = {};
                wrapper[modelNames[1]] = model;
                cmodels[modelNames[0]] = wrapper;
            }

            if (item.renderTarget) {
                ctextures[item.renderTarget] = textures[item.renderTarget];
            }
        });

        config.programs = cprograms;
        config.items = citems;
        config.textures = ctextures;
        config.models = cmodels;

        //debug('Config generated for %s: %s', name, JSON.stringify(config, null, 4));

        return [name, config];
    }));
}

function gl2Bytes(type) {
    var types = {
        'FLOAT': 4,
        'UNSIGNED_BYTE': 1,
        'UNSIGNED_SHORT': 2,
        'UNSIGNED_INT': 4
    };
    if (!(type in types))
        logger.die('Unknown GL type "%s"', type);
    return types[type];
}

function isBufClientSide(buf) {
    var datasource = _.values(buf)[0].datasource;
    return (datasource === VBODataSources.CLIENT || datasource === 'VERTEX_INDEX' || datasource === 'EDGE_INDEX');
}

function isBufServerSide(buf) {
    var datasource = _.values(buf)[0].datasource;
    return (datasource === 'HOST' || datasource === VBODataSources.DEVICE);
}

function isTextureServerSide(texture) {
    return texture.datasource  === VBODataSources.SERVER;
}

module.exports = {
    'scenes': generateAllConfigs(programs, textures, models, items, scenes),
    'gl2Bytes': gl2Bytes,
    'isBufClientSide': isBufClientSide,
    'isBufServerSide': isBufServerSide,
    'isTextureServerSide': isTextureServerSide,
    VBODataSources: VBODataSources
};

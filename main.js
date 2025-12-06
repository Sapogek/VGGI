'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let updateTimeout;
/**
 (перетворення точки)
 @param {Array<number>} m 
 @param {Array<number>} v 
 @returns {Array<number>} 
 */
function m4MultiplyVector(m, v) {
    let result = new Array(4);
    
    result[0] = m[0]*v[0] + m[4]*v[1] + m[8]*v[2]  + m[12]*v[3]; // X
    result[1] = m[1]*v[0] + m[5]*v[1] + m[9]*v[2]  + m[13]*v[3]; // Y
    result[2] = m[2]*v[0] + m[6]*v[1] + m[10]*v[2] + m[14]*v[3]; // Z
    result[3] = m[3]*v[0] + m[7]*v[1] + m[11]*v[2] + m[15]*v[3]; // W
    
    return result;
}
function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length/3;
    }

    this.Draw = function() {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
   
        gl.drawArrays(gl.LINE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() { 
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // 1. Обчислення Матриць Перетворення 
    
    // 1a. View Matrix (від Trackball Rotator)
    let viewMatrix = spaceball.getViewMatrix(); 
    console.log("View Matrix:", viewMatrix);
 
    // 1b. Model Matrix 
    let translateToPointZero = m4.translation(0, 0, 0);

    let modelMatrix = translateToPointZero; 
 
    // 1c. ModelView Matrix (View * Model)
    let modelViewMatrix = m4.multiply(viewMatrix, modelMatrix);
    
    // 1d. Projection Matrix 
    let projectionMatrix = m4.perspective(Math.PI / 8, 1, 0.01, 1000); 

    // 1e. Normal Matrix обернена транспонована ModelView
    let normalMatrix = m4.transpose(m4.inverse(modelViewMatrix));
    
    // 2. Розрахунок Позиції Світла
    
    let time = performance.now() * 0.0005; 
    let lightRadius = 150.0;
    let lightHeight = 50.0; 
    let lightX = lightRadius * Math.cos(time); 
    let lightZ = lightRadius * Math.sin(time);

    // 2a. Позиція світла 
    let lightPositionWorld = [lightX, lightHeight, lightZ, 1.0]; 
    
    // 2b. Позиція світла (View Space = ViewMatrix * WorldPosition)
    let lightPositionView = m4MultiplyVector(viewMatrix, lightPositionWorld);
    
    // --- 3. Передача Уніформ до GPU ---
    
    // Матриці
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    // Параметри освітлення 
    gl.uniform4fv(shProgram.iLightPosition, lightPositionView);
    gl.uniform4f(shProgram.iAmbientColor, 0.1, 0.1, 0.1, 1.0); 
    gl.uniform4f(shProgram.iDiffuseColor, 0.0, 0.5, 0.8, 1.0); 
    gl.uniform4f(shProgram.iSpecularColor, 1.0, 1.0, 1.0, 1.0);
    gl.uniform1f(shProgram.iShininess, 50.0); 
    
    surface.Draw();
    
    window.requestAnimationFrame(draw); 
}

function CreateSurfaceData()
{
    let vertexList = [];

    for (let i=0; i<360; i+=5) {
        vertexList.push( Math.sin(deg2rad(i)), 1, Math.cos(deg2rad(i)) );
        vertexList.push( Math.sin(deg2rad(i)), 0, Math.cos(deg2rad(i)) );
    }

    return vertexList;
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('PhongShading', prog);
    shProgram.Use();

    shProgram.iAttribVertex     = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal     = gl.getAttribLocation(prog, "normal"); 

    // Матриці
    shProgram.iModelViewMatrix  = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iNormalMatrix     = gl.getUniformLocation(prog, "NormalMatrix");

    // Освітлення та матеріал
    shProgram.iLightPosition    = gl.getUniformLocation(prog, "LightPosition");
    shProgram.iAmbientColor     = gl.getUniformLocation(prog, "AmbientColor");
    shProgram.iDiffuseColor     = gl.getUniformLocation(prog, "DiffuseColor");
    shProgram.iSpecularColor    = gl.getUniformLocation(prog, "SpecularColor");
    shProgram.iShininess        = gl.getUniformLocation(prog, "Shininess");
    
    surface = new SurfaceModel(gl, shProgram);
    surface.initBuffers();

    gl.enable(gl.DEPTH_TEST); 
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

function updateGranularity(axis) {
    let slider = document.getElementById(`num${axis}Slider`);
    let value = parseInt(slider.value);
    document.getElementById(`num${axis}Value`).textContent = value;
    
    if (surface) {
        if (axis === 'U') {
            surface.numU = value;
        } else if (axis === 'V') {
            surface.numV = value;
        }
        
        surface.initBuffers(); 
        draw(); 
    }
}

function updateSurface() {
    clearTimeout(updateTimeout);

    updateTimeout = setTimeout(() => {
        // Коефіцієнт p
        let p = parseFloat(document.getElementById("pInput").value);
        document.getElementById("pValue").textContent = p.toFixed(2); 
        
        // Коефіцієнт m
        let m = parseFloat(document.getElementById("mInput").value);
        document.getElementById("mValue").textContent = m.toFixed(2);

        // U Max
        let uMax = parseFloat(document.getElementById("uMaxInput").value);
        document.getElementById("uMaxValue").textContent = uMax.toFixed(2);
        
        // V Max
        let vMaxFactor = parseFloat(document.getElementById("vMaxInput").value);
        document.getElementById("vMaxValue").textContent = vMaxFactor.toFixed(1);
        
        if (surface && !isNaN(p) && !isNaN(m) && !isNaN(uMax) && !isNaN(vMaxFactor)) {
            

            surface.setParameters(p, m, uMax, vMaxFactor);

            surface.numU = parseInt(document.getElementById("numUSlider").value);
            surface.numV = parseInt(document.getElementById("numVSlider").value);
            
            surface.initBuffers();
            draw();
        } 
    }, 100); 
}
/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, null, 100);

    window.requestAnimationFrame(draw);
}

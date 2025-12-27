'use strict';

let gl;
let surface;
let shProgram;
let spaceball;
let updateTimeout;

let diffuseTexture;
let specularTexture;
let normalTexture;

let scaleCenter = { u: 0.5, v: 0.5 };
let scaleFactor = 1.0;

function m4MultiplyVector(m, v) {
    let result = new Array(4);
    result[0] = m[0]*v[0] + m[4]*v[1] + m[8]*v[2]  + m[12]*v[3];
    result[1] = m[1]*v[0] + m[5]*v[1] + m[9]*v[2]  + m[13]*v[3];
    result[2] = m[2]*v[0] + m[6]*v[1] + m[10]*v[2] + m[14]*v[3];
    result[3] = m[3]*v[0] + m[7]*v[1] + m[11]*v[2] + m[15]*v[3];
    return result;
}

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    this.iAttribTexCoord = -1;
    this.iAttribTangent = -1;
    this.iAttribBitangent = -1;
    
    this.iModelViewMatrix = -1;
    this.iProjectionMatrix = -1;
    this.iNormalMatrix = -1;
    this.iLightPosition = -1;
    this.iAmbientColor = -1;
    this.iDiffuseColor = -1;
    this.iSpecularColor = -1;
    this.iShininess = -1;
    
    this.iDiffuseTexture = -1;
    this.iSpecularTexture = -1;
    this.iNormalTexture = -1;

    this.iScaleCenter = -1;
    this.iScaleFactor = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}

function draw() { 
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    let viewMatrix = spaceball.getViewMatrix(); 
    let translateToPointZero = m4.translation(0, 0, 0);
    let modelMatrix = translateToPointZero; 
    let modelViewMatrix = m4.multiply(viewMatrix, modelMatrix);
    let projectionMatrix = m4.perspective(Math.PI / 8, 1, 0.01, 1000); 
    let normalMatrix = m4.transpose(m4.inverse(modelViewMatrix));
    
    let time = performance.now() * 0.0005; 
    let lightRadius = 150.0;
    let lightHeight = 50.0; 
    let lightX = lightRadius * Math.cos(time); 
    let lightZ = lightRadius * Math.sin(time);
    let lightPositionWorld = [lightX, lightHeight, lightZ, 1.0]; 
    let lightPositionView = m4MultiplyVector(viewMatrix, lightPositionWorld);
    
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);
    gl.uniform4fv(shProgram.iLightPosition, lightPositionView);
    gl.uniform4f(shProgram.iAmbientColor, 0.5, 0.5, 0.5, 1.0);
    gl.uniform4f(shProgram.iDiffuseColor, 1.5, 1.5, 1.5, 1.0);
    gl.uniform4f(shProgram.iSpecularColor, 1.8, 1.8, 1.8, 1.0); 
    gl.uniform1f(shProgram.iShininess, 50.0); 

    gl.uniform2f(shProgram.iScaleCenter, scaleCenter.u, scaleCenter.v);
    gl.uniform1f(shProgram.iScaleFactor, scaleFactor);
    
    // Зв'язування текстур
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
    gl.uniform1i(shProgram.iDiffuseTexture, 0);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, specularTexture);
    gl.uniform1i(shProgram.iSpecularTexture, 1);
    
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, normalTexture);
    gl.uniform1i(shProgram.iNormalTexture, 2);
    
    surface.Draw();
    
    window.requestAnimationFrame(draw); 
}

function loadTexture(url, callback) {
    const texture = gl.createTexture();
    const image = new Image();
    
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        
        if (callback) callback(texture);
    };
    
    image.src = url;
    return texture;
}

function handleKeyDown(event) {
    const step = 0.01;
    let changed = false;

    switch(event.code) {
        case 'KeyW': 
            scaleCenter.v = Math.min(scaleCenter.v + step, 1.0); 
            changed = true; 
            break;
        case 'KeyS': 
            scaleCenter.v = Math.max(scaleCenter.v - step, 0.0); 
            changed = true; 
            break;
        case 'KeyA': 
            scaleCenter.u = Math.max(scaleCenter.u - step, 0.0); 
            changed = true; 
            break;
        case 'KeyD': 
            scaleCenter.u = Math.min(scaleCenter.u + step, 1.0); 
            changed = true; 
            break;

        case 'KeyQ': 
            scaleFactor *= 0.95; 
            changed = true; 
            break; 
        case 'KeyE': 
            scaleFactor *= 1.05; 
            changed = true; 
            break;
    }

    if (changed) {
        document.getElementById("uvCoords").textContent = 
            `[${scaleCenter.u.toFixed(2)}; ${scaleCenter.v.toFixed(2)}]`;
        document.getElementById("scaleVal").textContent = 
            (1.0 / scaleFactor).toFixed(2);
    }
}

function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('TexturedPhongShading', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal"); 
    shProgram.iAttribTexCoord = gl.getAttribLocation(prog, "texCoord");
    shProgram.iAttribTangent = gl.getAttribLocation(prog, "tangent");
    shProgram.iAttribBitangent = gl.getAttribLocation(prog, "bitangent");

    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iLightPosition = gl.getUniformLocation(prog, "LightPosition");
    shProgram.iAmbientColor = gl.getUniformLocation(prog, "AmbientColor");
    shProgram.iDiffuseColor = gl.getUniformLocation(prog, "DiffuseColor");
    shProgram.iSpecularColor = gl.getUniformLocation(prog, "SpecularColor");
    shProgram.iShininess = gl.getUniformLocation(prog, "Shininess");
    
    shProgram.iDiffuseTexture = gl.getUniformLocation(prog, "diffuseTexture");
    shProgram.iSpecularTexture = gl.getUniformLocation(prog, "specularTexture");
    shProgram.iNormalTexture = gl.getUniformLocation(prog, "normalTexture");
    
    shProgram.iScaleCenter = gl.getUniformLocation(prog, "uScaleCenter");
    shProgram.iScaleFactor = gl.getUniformLocation(prog, "uScaleFactor");

    surface = new SurfaceModel(gl, shProgram);
    surface.initBuffers();

    // Завнтаження текстур
    diffuseTexture = loadTexture('textures/diffuse.jpg');
    specularTexture = loadTexture('textures/specular.jpg');
    normalTexture = loadTexture('textures/normal.jpg');

    gl.enable(gl.DEPTH_TEST); 
}

function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader: " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader: " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program: " + gl.getProgramInfoLog(prog));
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
    }
}

function updateSurface() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        let p = parseFloat(document.getElementById("pInput").value);
        document.getElementById("pValue").textContent = p.toFixed(2); 
        let m = parseFloat(document.getElementById("mInput").value);
        document.getElementById("mValue").textContent = m.toFixed(2);
        let uMax = parseFloat(document.getElementById("uMaxInput").value);
        document.getElementById("uMaxValue").textContent = uMax.toFixed(2);
        let vMaxFactor = parseFloat(document.getElementById("vMaxInput").value);
        document.getElementById("vMaxValue").textContent = vMaxFactor.toFixed(1);
        
        if (surface && !isNaN(p) && !isNaN(m) && !isNaN(uMax) && !isNaN(vMaxFactor)) {
            surface.setParameters(p, m, uMax, vMaxFactor);
            surface.numU = parseInt(document.getElementById("numUSlider").value);
            surface.numV = parseInt(document.getElementById("numVSlider").value);
            surface.initBuffers();
        } 
    }, 100); 
}

function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, null, 100);
    window.addEventListener('keydown', handleKeyDown);
    window.requestAnimationFrame(draw);
}
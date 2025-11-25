'use strict';

/**
 * Клас для зберігання та відображення Cornucopia
 */
function SurfaceModel(gl, shProgram) {
    this.gl = gl;
    this.shProgram = shProgram;
    this.iVertexBufferU = gl.createBuffer();
    this.iVertexBufferV = gl.createBuffer();

    // Параметри 
    this.p = 0.1;
    this.m = 0.1;
    this.numU = 50;
    this.numV = 50;
    this.uMin = 0.0;
    this.uMax = 4.0 * Math.PI;
    this.vMin = 0.0;
    this.vMax = 2.0 * Math.PI;
 
    this.setParameters = function(newP, newM, newUMax, newVMaxFactor, newNumSegments) {
        this.p = newP;
        this.m = newM; 
        this.uMax = newUMax;
        this.numU = newNumSegments;
        this.numV = newNumSegments;
        this.vMax = newVMaxFactor * Math.PI;
    }

    this.SurfacePoint = function(u, v) {

        let expP_U = Math.exp(this.p * u); 
        let expM_U = Math.exp(this.m * u);
        let factor = expM_U + expP_U * Math.cos(v);

        let x = factor * Math.cos(u);
        let y = factor * Math.sin(u);
        let z = expP_U * Math.sin(v);
        
        return [x, y, z];
    }  
    
    // Код для генерації 
    
    this.GenerateUGrid = function(uRange, vRange) {
        let uMin = uRange[0], uMax = uRange[1];
        let vMin = vRange[0], vMax = vRange[1];
        let vertices = [];
        
        for (let j = 0; j <= this.numV; j++) {
            let v = vMin + j * (vMax - vMin) / this.numV;
            for (let i = 0; i <= this.numU; i++) {
                let u = uMin + i * (uMax - uMin) / this.numU;
                vertices.push(...this.SurfacePoint(u, v));
            }
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.iVertexBufferU);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        this.countU = vertices.length / 3;
    }

    this.GenerateVGrid = function(uRange, vRange) {
        let uMin = uRange[0], uMax = uRange[1];
        let vMin = vRange[0], vMax = vRange[1];
        let vertices = [];

        for (let i = 0; i <= this.numU; i++) {
            let u = uMin + i * (uMax - uMin) / this.numU;  
            for (let j = 0; j <= this.numV; j++) {
                let v = vMin + j * (vMax - vMin) / this.numV;
                vertices.push(...this.SurfacePoint(u, v));
            }
        }
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.iVertexBufferV);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        this.countV = vertices.length / 3;
    }

    this.initBuffers = function() {
        this.GenerateUGrid([this.uMin, this.uMax], [this.vMin, this.vMax]);
        this.GenerateVGrid([this.uMin, this.uMax], [this.vMin, this.vMax]);
    }
    
    this.Draw = function() {
    let uPointsPerCurve = this.numU + 1; 
    let vPointsPerCurve = this.numV + 1;

    // 1. Малювання U-кривих (V = const)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.iVertexBufferU);
    this.gl.vertexAttribPointer(this.shProgram.iAttribVertex, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.shProgram.iAttribVertex);
    
    for (let j = 0; j <= this.numV; j++) {
    this.gl.drawArrays(this.gl.LINE_STRIP, j * uPointsPerCurve, uPointsPerCurve); 
}

    // 2. Малювання V-кривих (U = const)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.iVertexBufferV);
    this.gl.vertexAttribPointer(this.shProgram.iAttribVertex, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.shProgram.iAttribVertex);
    
    for (let i = 0; i <= this.numU; i++) {
    this.gl.drawArrays(this.gl.LINE_STRIP, i * vPointsPerCurve, vPointsPerCurve); 
}
    }
}  
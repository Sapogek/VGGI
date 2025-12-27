'use strict';

function SurfaceModel(gl, shProgram) {
    this.gl = gl;
    this.shProgram = shProgram;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iTexCoordBuffer = gl.createBuffer();

    this.iTangentBuffer = gl.createBuffer();
    this.iBitangentBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    
    this.nFaces = 0;    

    this.p = 0.1;
    this.m = 0.1;
    this.numU = 50;
    this.numV = 50;
    this.uMin = 0.0;
    this.uMax = 4.0 * Math.PI;
    this.vMin = 0.0;
    this.vMax = 2.0 * Math.PI;
 
    this.setParameters = function(newP, newM, newUMax, newVMaxFactor) {
        this.p = newP;
        this.m = newM; 
        this.uMax = newUMax;
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
    
    //  Часткова похідна за u
    this.SurfaceDerivativeU = function(u, v) {
        let expP_U = Math.exp(this.p * u);
        let expM_U = Math.exp(this.m * u);
        let cosU = Math.cos(u);
        let sinU = Math.sin(u);
        let cosV = Math.cos(v);
        let sinV = Math.sin(v);
        
        let factor = expM_U + expP_U * cosV;
        let dFactor_dU = this.m * expM_U + this.p * expP_U * cosV;
        
        let dx = dFactor_dU * cosU - factor * sinU;
        let dy = dFactor_dU * sinU + factor * cosU;
        let dz = this.p * expP_U * sinV;
        
        return [dx, dy, dz];
    }
    
    // Часткова похідна за v
    this.SurfaceDerivativeV = function(u, v) {
        let expP_U = Math.exp(this.p * u);
        let cosU = Math.cos(u);
        let sinU = Math.sin(u);
        let cosV = Math.cos(v);
        let sinV = Math.sin(v);
        
        let dFactor_dV = -expP_U * sinV;
        
        let dx = dFactor_dV * cosU;
        let dy = dFactor_dV * sinU;
        let dz = expP_U * cosV;
        
        return [dx, dy, dz];
    }

    this.GenerateSurfaceAndNormals = function() {
    let vertices = [];
    let normals = [];
    let texCoords = [];
    let tangents = [];
    let bitangents = [];
    let indices = [];
    
    let uStep = (this.uMax - this.uMin) / this.numU;
    let vStep = (this.vMax - this.vMin) / this.numV;
    
    for (let i = 0; i <= this.numU; i++) {
        let u = this.uMin + i * uStep;
        for (let j = 0; j <= this.numV; j++) {
            let v = this.vMin + j * vStep;
            
            // Позиція вершини
            let point = this.SurfacePoint(u, v);
            vertices.push(...point);
            
            // Текстурні координати
            let s = i / this.numU;
            let t = j / this.numV;
            texCoords.push(s, t);
            
            // Обчислення геометричних похідних
            let dPdu = this.SurfaceDerivativeU(u, v);
            let dPdv = this.SurfaceDerivativeV(u, v);
            
            // Тангента головний вектор. Фіксуємо напрямок.
            let T = [...dPdu];
            m4.normalize(T, T);
            
            // Початкова нормаль з векторного добутку похідних
            let rawN = m4.cross(dPdu, dPdv);
            m4.normalize(rawN, rawN);
            
            // Формула: N' = normalize(N - (T · N) * T)
            let dotTN = T[0] * rawN[0] + T[1] * rawN[1] + T[2] * rawN[2];
            let N = [
                rawN[0] - dotTN * T[0],
                rawN[1] - dotTN * T[1],
                rawN[2] - dotTN * T[2]
            ];
            m4.normalize(N, N);
            
            // B = N x T
            let B = m4.cross(N, T);
            m4.normalize(B, B);
            
            normals.push(...N);
            tangents.push(...T);
            bitangents.push(...B);
        }
    }


    let cols = this.numV + 1;
    for (let i = 0; i < this.numU; i++) {
        for (let j = 0; j < this.numV; j++) {
            let i1 = i * cols + j;
            let i2 = i1 + cols;
            let i3 = i1 + 1;
            let i4 = i2 + 1;
            
            indices.push(i1, i2, i3); 
            indices.push(i3, i2, i4);
        }
    }
    this.nFaces = indices.length;
    
    // Передача даних у буфери WebGL
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tangents), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iBitangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bitangents), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
};

    this.initBuffers = function() {
        this.GenerateSurfaceAndNormals();
    };
    
    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(this.shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.shProgram.iAttribVertex);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(this.shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.shProgram.iAttribNormal);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
        gl.vertexAttribPointer(this.shProgram.iAttribTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.shProgram.iAttribTexCoord);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
        gl.vertexAttribPointer(this.shProgram.iAttribTangent, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.shProgram.iAttribTangent);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iBitangentBuffer);
        gl.vertexAttribPointer(this.shProgram.iAttribBitangent, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.shProgram.iAttribBitangent);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.nFaces, gl.UNSIGNED_SHORT, 0);
    }
}
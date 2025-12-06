'use strict';

function SurfaceModel(gl, shProgram) {
    this.gl = gl;
    this.shProgram = shProgram;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
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
    
    

    this.GenerateSurfaceAndNormals = function() {
    let vertices = [];
    let normals = [];
    let indices = [];
    
    let uStep = (this.uMax - this.uMin) / this.numU;
    let vStep = (this.vMax - this.vMin) / this.numV;
    
    for (let i = 0; i <= this.numU; i++) {
        let u = this.uMin + i * uStep;
        for (let j = 0; j <= this.numV; j++) {
            let v = this.vMin + j * vStep;
            
            let point = this.SurfacePoint(u, v);
            vertices.push(...point);
            
            normals.push(0, 0, 0); 
        }
    }

    let rows = this.numU + 1;
    let cols = this.numV + 1;
    for (let i = 0; i < this.numU; i++) {
        for (let j = 0; j < this.numV; j++) {
            let i1 = i * cols + j;
            let i2 = i1 + cols;
            let i3 = i1 + 1;
            let i4 = i2 + 1;
            
            // Трикутник 1: (i1, i2, i3)
            indices.push(i1, i2, i3); 
            // Трикутник 2: (i3, i2, i4)
            indices.push(i3, i2, i4);
        }
    }
    this.nFaces = indices.length;


    const computeFaceNormal = (i1, i2, i3) => {
        // Отримання координат вершин V1, V2, V3
        let V1 = vertices.slice(i1 * 3, i1 * 3 + 3);
        let V2 = vertices.slice(i2 * 3, i2 * 3 + 3);
        let V3 = vertices.slice(i3 * 3, i3 * 3 + 3);

        // Обчислення векторів 
        let E12 = [V2[0]-V1[0], V2[1]-V1[1], V2[2]-V1[2]];
        let E13 = [V3[0]-V1[0], V3[1]-V1[1], V3[2]-V1[2]];
        
        // Нормаль грані
        let N = m4.cross(E12, E13); 
        m4.normalize(N, N);
        return N;
    };

    // Обнуляємо масив нормалей для усереднення
    let averagedNormals = new Array(vertices.length).fill(0);

    for (let k = 0; k < indices.length; k += 3) {
        let i1 = indices[k], i2 = indices[k+1], i3 = indices[k+2];
        let faceNormal = computeFaceNormal(i1, i2, i3);
        
        // Сумуємо нормаль грані до нормалей вершин, що її утворюють
        for (let idx of [i1, i2, i3]) {
            averagedNormals[idx * 3]   += faceNormal[0];
            averagedNormals[idx * 3 + 1] += faceNormal[1];
            averagedNormals[idx * 3 + 2] += faceNormal[2];
        }
    }
    
    // Нормалізуємо усереднені нормалі
    for (let i = 0; i < averagedNormals.length; i += 3) {
        let N = averagedNormals.slice(i, i + 3);
        m4.normalize(N, N);
        normals[i] = N[0];
        normals[i+1] = N[1];
        normals[i+2] = N[2];
    }
    
    // 4. Завантаження даних у GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    
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
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
    gl.drawElements(gl.TRIANGLES, this.nFaces, gl.UNSIGNED_SHORT, 0);
    }
}  
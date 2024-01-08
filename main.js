'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

let R1 = 0.35;                   // Radius of smaller cylinder
let R2 = 3 * R1;                // Radius of bigger cylinder
let b =  3 * R1;                // Height of the surface
let stepAlpha = 0.1             // Step for alpha
let stepBeta = 1               // Step for beta

let horizontals = 0;
let verticals = 0;

// Degree to Radian
function deg2rad(angle) {
    return angle * Math.PI / 180;
}

// Update parameters on user change
function setParameters(R1New, R2New, BNew, alphaNew, betaNew){
    R1 = R1New; 
    //R2 = 3 * R1;
    R2 = R2New;
    //b =  3 * R1;
    b = BNew;
    stepAlpha = alphaNew
    stepBeta = betaNew;
    horizontals = 0;
    verticals = 0;
}

function updateHtml(r1, r2, b, alphaStep, betaStep){
    document.getElementById("R1Current").textContent = r1;
    document.getElementById("R2Current").textContent = r2;
    document.getElementById("BCurrent").textContent = b;
    document.getElementById("AlphaCurrent").textContent = alphaStep;
    document.getElementById("BetaCurrent").textContent = betaStep;

    document.getElementById("paramR1").value = r1
    document.getElementById("paramR2").value = r2
    document.getElementById("paramB").value = b
    document.getElementById("paramAlphaStep").value = alphaStep;
    document.getElementById("paramBetaStep").value = betaStep;
}

// Function to set default surface parameters
function setDefault() {
    const r1 = 0.35                                               
    const r2 = 1.05
    const b = 1.05
    const alphaStep = 0.1;
    const betaStep = 1;

    setParameters(r1, r2, b, alphaStep, betaStep)
    updateHtml(r1, r2, b, alphaStep, betaStep)
    surface.BufferData(CreateSurfaceData());
    draw();
}

// Function to update the surface with the new max value of parameter r
function updateParameters() {
    const r1 = parseFloat(document.getElementById("paramR1").value);
    const r2 = parseFloat(document.getElementById("paramR2").value);
    const b = parseFloat(document.getElementById("paramB").value);
    const alphaStep = parseFloat(document.getElementById("paramAlphaStep").value);
    const betaStep = parseFloat(document.getElementById("paramBetaStep").value);
    
    setParameters(r1, r2, b, alphaStep, betaStep)

    updateHtml(r1, r2, b, alphaStep, betaStep)
    surface.BufferData(CreateSurfaceData());
    draw();
}

// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices, normals) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        this.count = vertices.length/3;
    }

    this.Draw = function() {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.iWorldInverseTransposeLocation =  -1;
    this.iLightWorldPositionLocation = -1;
    this.iWorldLocation = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() { 
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI/6, 1, 8, 12); 
    
    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );
        
    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1 );

    let worldInverseMatrix = m4.inverse(matAccum1);
    let worldInverseTransposeMatrix = m4.transpose(worldInverseMatrix);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );
    gl.uniformMatrix4fv(shProgram.iWorldInverseTransposeLocation, false, worldInverseTransposeMatrix);
    gl.uniformMatrix4fv(shProgram.iWorldLocation, false, matAccum1);
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );
    gl.uniform3fv(shProgram.iLightWorldPositionLocation, [20, 30, 50]);
    surface.Draw();
}

// Function to calculate X surface coordinate
function getX (alpha, beta){
    let r = ( R2 - R1 ) * Math.pow(Math.sin(deg2rad(( 180 * alpha ) / (4 * b))),2) + R1; 
    return r * Math.cos(deg2rad(beta));
}

// Function to calculate Y surface coordinate
function getY (alpha, beta){
    let r = ( R2 - R1 ) * Math.pow(Math.sin(deg2rad(( 180 * alpha ) / (4 * b))),2) + R1; 
    return r * Math.sin(deg2rad(beta))
}

// Function to calculate Z surface coordinate
function getZ(alpha){
    return alpha;
}

// Partial derivatives for U
function getDerivativeU(u, v, x, y, z, delta){
    let dx_du = (getX(u + delta, v) - x) / deg2rad(delta);  
    let dy_du = (getY(u + delta, v) - y) / deg2rad(delta);
    let dz_du = (getZ(u + delta, v) - z) / deg2rad(delta);

    return [dx_du, dy_du, dz_du];
}

// Partial derivatives for V
function getDerivativeV(u, v, x, y, z, delta){
    let dx_dv = (getX(u, v + delta) - x) / deg2rad(delta);  
    let dy_dv = (getY(u, v + delta) - y) / deg2rad(delta);
    let dz_dv = (getZ(u, v + delta) - z) / deg2rad(delta);

    return [dx_dv, dy_dv, dz_dv];
}

function CreateSurfaceData()
{
    let vertexList = [];
    let normalsList = [];
    let x = 0
    let y = 0
    let z = 0
    let delta = 0.0001
    // Ranges:
    // 0 <= alpha(i) <= 2b
    // 0 <= beta(j) <= 2PI
    for (let i = 0;  i <= 2 * b;  i+= stepAlpha) {
        for (let j = 0; j <= 360; j+=stepBeta){

            x = getX(i, j);
            y = getY(i, j);
            z = getZ(i);
            let derU = getDerivativeU(i, j, x, y, z, delta);
            let derV = getDerivativeV(i, j, x, y, z, delta);
            let UVproduct = m4.cross(derU, derV);
            
            vertexList.push(x, y, z);
            normalsList.push(UVproduct[0], UVproduct[1], UVproduct[2]);


            x = getX(i + 0.1, j);
            y = getY(i + 0.1, j);
            z = getZ(i + 0.1);
            derU = getDerivativeU(i + 0.1, j, x, y, z, delta);
            derV = getDerivativeV(i + 0.1, j, x, y, z, delta);
            UVproduct = m4.cross(derU, derV);
            
            vertexList.push(x, y, z);
            normalsList.push(UVproduct[0], UVproduct[1], UVproduct[2]);
        }
    }

    return [vertexList, normalsList]; 
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal              = gl.getAttribLocation(prog,"normal");

    shProgram.iWorldInverseTransposeLocation = gl.getUniformLocation(prog, "worldInverseTranspose");
    shProgram.iLightWorldPositionLocation = gl.getUniformLocation(prog, "lightWorldPosition");
    shProgram.iWorldLocation = gl.getUniformLocation(prog, "world");


    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor                     = gl.getUniformLocation(prog, "color");

    surface = new Model('Surface');
    let surfaceInfo = CreateSurfaceData()
    let vertex = surfaceInfo[0];
    let normals = surfaceInfo[1]

    surface.BufferData(vertex, normals);

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

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}

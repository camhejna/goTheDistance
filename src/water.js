/**
 * 	@author mrdoob / http://mrdoob.com
 *	@author camhejna
 *
 *	Creates a water texture. Adjust materialColor to change color.
 *	Dependencies: three.js, GPUComputationRenderer.js, SimplexNoise.js
 *	Required in init(): initWater(renderer, scene, camera);
 *	Required in render(): gpuCompute.compute();
 *	Required in render(): waterUniforms.heightmap.value = gpuCompute.getCurrentRenderTarget( heightmapVariable ).texture;
 *	
 *	v1.0
 *	2017.27.07
 */

var WIDTH, NUM_TEXELS, BOUNDS, BOUNDS_HALF;
var waterMesh, waterSize, shader, simplex, meshRay, gpuCompute, heightMapVariable, waterUniforms, smoothShader;

function initWater(RENDERER, SCENE, CAMERA){
	
	WIDTH = 128;
	NUM_TEXELS = WIDTH * WIDTH;
	BOUNDS = CAMERA.far;
	BOUNDS_HALF = BOUNDS * 0.5;
	waterSize = WIDTH * WIDTH;
	
	var materialColor = 0x001d4c;
	
	simplex = new SimplexNoise();
	
	shader = new waterShaders();
	
	var geometry = new THREE.PlaneBufferGeometry( BOUNDS, BOUNDS, WIDTH - 1, WIDTH -1 );
	// material: make a ShaderMaterial clone of MeshPhongMaterial, with customized vertex shader
	var material = new THREE.ShaderMaterial( {
		uniforms: THREE.UniformsUtils.merge( [
			THREE.ShaderLib[ 'phong' ].uniforms,
					{
						heightmap: { value: null }
					}
			] ),
		vertexShader: shader.vertexShader,
		fragmentShader: THREE.ShaderChunk[ 'meshphong_frag' ]
	} );
	material.lights = true;
	
	// Material attributes from MeshPhongMaterial
	material.color = new THREE.Color( materialColor );
	material.specular = new THREE.Color( 0x111111 );
	material.shininess = 50;
	
	// Sets the uniforms with the material values
	material.uniforms.diffuse.value = material.color;
	material.uniforms.specular.value = material.specular;
	material.uniforms.shininess.value = Math.max( material.shininess, 1e-4 );
	material.uniforms.opacity.value = material.opacity;
	
	// Defines
	material.defines.WIDTH = WIDTH.toFixed( 1 );
	material.defines.BOUNDS = BOUNDS.toFixed( 1 );
	waterUniforms = material.uniforms;
	waterMesh = new THREE.Mesh( geometry, material );
	waterMesh.rotation.x = - Math.PI / 2;
	waterMesh.matrixAutoUpdate = false;
	waterMesh.updateMatrix();
	scene.add( waterMesh );
	
	/*//
	// Mesh just for mouse raycasting
	var geometryRay = new THREE.PlaneBufferGeometry( BOUNDS, BOUNDS, 1, 1 );
	meshRay = new THREE.Mesh( geometryRay, new THREE.MeshBasicMaterial( { color: 0xFFFFFF, visible: false } ) );
	meshRay.rotation.x = - Math.PI / 2;
	meshRay.matrixAutoUpdate = false;
	meshRay.updateMatrix();
	scene.add( meshRay );
	//*/
	
	// Creates the gpu computation class and sets it up
	gpuCompute = new GPUComputationRenderer( WIDTH, WIDTH, renderer);
	var heightmap0 = gpuCompute.createTexture();
	fillTexture( heightmap0 );
	heightmapVariable = gpuCompute.addVariable( "heightmap", shader.heightmapFragmentShader, heightmap0 );
	gpuCompute.setVariableDependencies( heightmapVariable, [ heightmapVariable ] );
	heightmapVariable.material.uniforms.mousePos = { value: new THREE.Vector2( 10000, 10000 ) };
	heightmapVariable.material.uniforms.mouseSize = { value: 20.0 };
	heightmapVariable.material.uniforms.viscosityConstant = { value: 0.03 };
	heightmapVariable.material.defines.BOUNDS = BOUNDS.toFixed( 1 );
	var error = gpuCompute.init();
	if ( error !== null ) {
	   console.error( error );
	}
	
	// Create compute shader to smooth the water surface and velocity
	smoothShader = gpuCompute.createShaderMaterial( shader.smoothFragmentShader, { texture: { value: null } } );
}

function fillTexture( texture ) {

	var waterMaxHeight = 10;

	function noise( x, y, z ) {
		var multR = waterMaxHeight;
		var mult = 0.025;
		var r = 0;
		for ( var i = 0; i < 15; i++ ) {
			r += multR * simplex.noise3d( x * mult, y * mult, z * mult );
			multR *= 0.53 + 0.025 * i;
			mult *= 1.25;
		}
		return r;
	}

	var pixels = texture.image.data;

	var p = 0;
	for ( var j = 0; j < WIDTH; j++ ) {
		for ( var i = 0; i < WIDTH; i++ ) {

			var x = i * 128 / WIDTH;
			var y = j * 128 / WIDTH;

			pixels[ p + 0 ] = noise( x, y, 123.4 );
			pixels[ p + 1 ] = 0;
			pixels[ p + 2 ] = 0;
			pixels[ p + 3 ] = 1;

			p += 4;
		}
	}

}

function smoothWater() {

	var currentRenderTarget = gpuCompute.getCurrentRenderTarget( heightmapVariable );
	var alternateRenderTarget = gpuCompute.getAlternateRenderTarget( heightmapVariable );

	for ( var i = 0; i < 10; i++ ) {

		smoothShader.uniforms.texture.value = currentRenderTarget.texture;
		gpuCompute.doRenderTarget( smoothShader, alternateRenderTarget );

		smoothShader.uniforms.texture.value = alternateRenderTarget.texture;
		gpuCompute.doRenderTarget( smoothShader, currentRenderTarget );
	}
}

var waterShaders = function(){

	this.heightmapFragmentShader = [

		"#include <common>",
			"uniform vec2 mousePos;",
			"uniform float mouseSize;",
			"uniform float viscosityConstant;",
			"#define deltaTime ( 1.0 / 60.0 )",
			"#define GRAVITY_CONSTANT ( resolution.x * deltaTime * 3.0 )",
			"void main()	{",
				"vec2 cellSize = 1.0 / resolution.xy;",
				"vec2 uv = gl_FragCoord.xy * cellSize;",
				"// heightmapValue.x == height",
				"// heightmapValue.y == velocity",
				"// heightmapValue.z, heightmapValue.w not used",
				"vec4 heightmapValue = texture2D( heightmap, uv );",
				"// Get neighbours",
				"vec4 north = texture2D( heightmap, uv + vec2( 0.0, cellSize.y ) );",
				"vec4 south = texture2D( heightmap, uv + vec2( 0.0, - cellSize.y ) );",
				"vec4 east = texture2D( heightmap, uv + vec2( cellSize.x, 0.0 ) );",
				"vec4 west = texture2D( heightmap, uv + vec2( - cellSize.x, 0.0 ) );",
				"float sump = north.x + south.x + east.x + west.x - 4.0 * heightmapValue.x;",
				"float accel = sump * GRAVITY_CONSTANT;",
				"// Dynamics",
				"heightmapValue.y += accel;",
				"heightmapValue.x += heightmapValue.y * deltaTime;",
				"// Viscosity",
				"heightmapValue.x += sump * viscosityConstant;",
				"// Mouse influence",
				"float mousePhase = clamp( length( ( uv - vec2( 0.5 ) ) * BOUNDS - vec2( mousePos.x, - mousePos.y ) ) * PI / mouseSize, 0.0, PI );",
				"heightmapValue.x += cos( mousePhase ) + 1.0;",
				"gl_FragColor = heightmapValue;",
			"}",

	].join("\n");

	this.smoothFragmentShader = [ 
		"uniform sampler2D texture;",
			"void main()	{",
				"vec2 cellSize = 1.0 / resolution.xy;",
				"vec2 uv = gl_FragCoord.xy * cellSize;",
				"// Computes the mean of texel and 4 neighbours",
				"vec4 textureValue = texture2D( texture, uv );",
				"textureValue += texture2D( texture, uv + vec2( 0.0, cellSize.y ) );",
				"textureValue += texture2D( texture, uv + vec2( 0.0, - cellSize.y ) );",
				"textureValue += texture2D( texture, uv + vec2( cellSize.x, 0.0 ) );",
				"textureValue += texture2D( texture, uv + vec2( - cellSize.x, 0.0 ) );",
				"textureValue /= 5.0;",
				"gl_FragColor = textureValue;",
			"}",
	].join("\n");
	
	this.vertexShader = [
 
	"uniform sampler2D heightmap;",
			"#define PHONG",
			"varying vec3 vViewPosition;",
			"#ifndef FLAT_SHADED",
				"varying vec3 vNormal;",
			"#endif",
			"#include <common>",
			"#include <uv_pars_vertex>",
			"#include <uv2_pars_vertex>",
			"#include <displacementmap_pars_vertex>",
			"#include <envmap_pars_vertex>",
			"#include <color_pars_vertex>",
			"#include <morphtarget_pars_vertex>",
			"#include <skinning_pars_vertex>",
			"#include <shadowmap_pars_vertex>",
			"#include <logdepthbuf_pars_vertex>",
			"#include <clipping_planes_pars_vertex>",
			"void main() {",
				"vec2 cellSize = vec2( 1.0 / WIDTH, 1.0 / WIDTH );",
				"#include <uv_vertex>",
				"#include <uv2_vertex>",
				"#include <color_vertex>",
				"// # include <beginnormal_vertex>",
				"// Compute normal from heightmap",
				"vec3 objectNormal = vec3(",
					"( texture2D( heightmap, uv + vec2( - cellSize.x, 0 ) ).x - texture2D( heightmap, uv + vec2( cellSize.x, 0 ) ).x ) * WIDTH / BOUNDS,",
					"( texture2D( heightmap, uv + vec2( 0, - cellSize.y ) ).x - texture2D( heightmap, uv + vec2( 0, cellSize.y ) ).x ) * WIDTH / BOUNDS,",
					"1.0 );",
				"//<beginnormal_vertex>",
				"#include <morphnormal_vertex>",
				"#include <skinbase_vertex>",
				"#include <skinnormal_vertex>",
				"#include <defaultnormal_vertex>",
			"#ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED",
				"vNormal = normalize( transformedNormal );",
			"#endif",
				"//# include <begin_vertex>",
				"float heightValue = texture2D( heightmap, uv ).x;",
				"vec3 transformed = vec3( position.x, position.y, heightValue );",
				"//<begin_vertex>",
				"#include <morphtarget_vertex>",
				"#include <skinning_vertex>",
				"#include <displacementmap_vertex>",
				"#include <project_vertex>",
				"#include <logdepthbuf_vertex>",
				"#include <clipping_planes_vertex>",
				"vViewPosition = - mvPosition.xyz;",
				"#include <worldpos_vertex>",
				"#include <envmap_vertex>",
				"#include <shadowmap_vertex>",
			"}",

   	 ].join("\n");
	 
}
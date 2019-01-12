function loadImage(gl, url, callback) {
	var image = new Image();
	image.src = url;
	image.onload = callback;
	return image;
}

function loadImages(gl, urls, callback) {
	var images = [];
	var imagesToLoad = urls.length;

	var onImageLoad = function() {
		--imagesToLoad;
		if (imagesToLoad == 0) {
			callback(gl, images);
		}
	};
	for (var ii = 0; ii < imagesToLoad; ++ii) {
		var image = loadImage(gl, urls[ii], onImageLoad);
		images[ii] = image;
	}
}

let depth_framebuffer_generator = function(gl, _withColorTexture=false, dim=[1024,1024]){

	let colorTexture = (function(gl){
		if (!_withColorTexture) return null
		let tmp = gl.createTexture()
		gl.bindTexture(gl.TEXTURE_2D, tmp);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, dim[0], dim[1], 0, gl.RGB, gl.UNSIGNED_BYTE, null)
		return tmp
	})(gl);

	let depthTexture = (function(gl){
		let tmp = gl.createTexture()
		gl.bindTexture(gl.TEXTURE_2D, tmp);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, dim[0], dim[1], 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null)
		return tmp
	})(gl)

	let framebuffer = gl.createFramebuffer()
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
	if (_withColorTexture) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

	gl.bindTexture(gl.TEXTURE_2D, null)
	gl.bindFramebuffer(gl.FRAMEBUFFER, null)

	return {
		framebuffer: framebuffer,
		dimension: Array.from(dim),
		colorTexture: colorTexture,
		depthTexture: depthTexture,
		setupFB: function(gl) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			gl.viewport(0, 0, this.dimension[0], this.dimension[1]);
		},
		tidyupFB: function(gl) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		},
		destroy: function(gl) {
			if (this.depthTexture) gl.deleteTexture(this.depthTexture)
			if (this.colorTexture) gl.deleteTexture(this.colorTexture)
			if (this.framebuffer) gl.deleteFramebuffer(this.framebuffer)
		}
	}

};

function timer() {
	this.starttimer = ( + new Date() ) / 1000.0
	this.timestamp = function(){return ( ( + new Date() )/1000.0 - this.starttimer );}
}

function createTextureFromCanvas(gl, _canvas) {

	let texture = gl.createTexture()

	gl.bindTexture(gl.TEXTURE_2D, texture);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _canvas)

	gl.bindTexture(gl.TEXTURE_2D, null);

	return texture;
}

function createOctNoiseFunction(gpu) {

	gpu.addFunction(function noise3D(x, y, z) {

		function inc(a){
			return mode(a+1,256);
		}

		function mode(a, b){
			return a - Math.floor(a/b) * b;
		}

		function grad(h, x, y, z){
				h = mode(h, 16);
				let u=y;
				if (h < 8) u=x;

				let v=z;
				if(h < 4)
					v = y;
				else if(h == 12|| h == 14)
					v = x;

				if (mode(h  , 2)!=0) u=-u;
				if (mode(h/2, 2)!=0) v=-v;

				return u+v;
		}

		function randFloat(i){
			i = Math.sin(i) * 43758.54534352341;
			return i - Math.floor(i);
		}

		function fade(f){
			return f * f * f * ( f * ( f * 6 - 15 ) + 10 );
		}

		function length(x, y) {
			return Math.sqrt(x*x+y*y)
		}

		function dist(from_x, from_y, to_x, to_y) {
			return Math.sqrt( (to_x-from_x)*(to_x-from_x) + (to_y-from_y)*(to_y-from_y) )
		}

		function smoothstep(x) {
			x = clamp(x, 0, 1);
			return x * x * (3 - 2 * x);
		}

		function rand255(i){
			i = mode(i, 256)/255.0 * 2 * 3.14159265358979;
			i = randFloat(i);
			return Math.floor(Math.abs(i) * 256.0)
		}

		function lerp(a, b, t){
			return a + t * (b - a);
		}

		let xx = x/256.;
		let yy = y/256.;
		let zz = z/256.;

		let xi = mode(Math.floor(xx), 256)
		let yi = mode(Math.floor(yy), 256)
		let zi = mode(Math.floor(zz), 256)

		let xf = xx - xi;
		let yf = yy - yi;
		let zf = zz - zi;

		let u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
		let v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
		let w = zf * zf * zf * (zf * (zf * 6 - 15) + 10);

		let aaa, aba, aab, abb, baa, bba, bab, bbb;
		{
			aaa = rand255(rand255(rand255(    xi )+    yi )+    zi );
			aba = rand255(rand255(rand255(    xi )+inc(yi))+    zi );
			aab = rand255(rand255(rand255(    xi )+    yi )+inc(zi));
			abb = rand255(rand255(rand255(    xi )+inc(yi))+inc(zi));
			baa = rand255(rand255(rand255(inc(xi))+    yi )+    zi );
			bba = rand255(rand255(rand255(inc(xi))+inc(yi))+    zi );
			bab = rand255(rand255(rand255(inc(xi))+    yi )+inc(zi));
			bbb = rand255(rand255(rand255(inc(xi))+inc(yi))+inc(zi));
		}

		let x1, x2, y1, y2;

		{//lerp
			x1 = lerp(
						grad (aaa, xf  , yf  , zf),
						grad (baa, xf-1, yf  , zf),
						u
			);

			x2 = lerp(
						grad (aba, xf  , yf-1, zf),
						grad (bba, xf-1, yf-1, zf),
						u
			);

			y1 = lerp(x1, x2, v);

			x1 = lerp(
						grad (aab, xf  , yf  , zf-1),
						grad (bab, xf-1, yf  , zf-1),
						u
			);

			x2 = lerp(
						grad (abb, xf  , yf-1, zf-1),
						grad (bbb, xf-1, yf-1, zf-1),
						u
			);

			y2 = lerp (x1, x2, v);
		}

		//return lerp (y1, y2, w);
		let res = lerp (y1, y2, w);

		return ( res + 1 ) / 2;

	})

	gpu.addFunction(function octave3D(x, y, z, oct, persit) {
		let total = 0;
		let frequency = 1;
		let amplitude = 1;
		let maxValue = 0;  // Used for normalizing result to 0.0 - 1.0
		for(let i=0;i<oct;i+=1) {
			total += noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
			maxValue += amplitude;
			amplitude *= persit;
			frequency *= 2;
		}
		return total/maxValue;
	})

	gpu.addFunction(function vignette(x,y) {
		let RADIUS = 0.75;
		let SOFTNESS = 0.5;

		let posX = x-0.5;
		let posY = y-0.5;

		let vignette = smoothstep(RADIUS, RADIUS-SOFTNESS, length(posX, posY));

		return vignette;
	})

	gpu.addFunction(function masking(val, fac) {
			if (val >= fac) return 1
			return 0
	})

}

function createGPUInstance(id_string, dimension=[1024,1024], webGl=null) {
	let canvas = document.createElement('canvas');
	let gl = webGl || canvas.getContext("webgl", { alpha: true });
	let gpu = new GPU({mode: 'gpu', canvas: canvas, webGl: gl});
	document.body.appendChild(canvas);
	canvas.style.display='none';
	let kernels = {};
	return {
		id: id_string,
		dimension: dimension,
		gpu: gpu,
		gl: gpu.getWebGl(),
		canvas: canvas,
		renderToTexture: function(gl) { return createTextureFromCanvas(gl, canvas); },
		toggleVisibility: function() {
			if (canvas.style.display=='none') canvas.style.display='block';
			else canvas.style.display='none';
		},
		kernels: kernels,
	}
}

function createTextureFromMatrix(gl, gpu, kernels, m) {
	if (!kernels["RenderToTexture"]) {
		kernels["RenderToTexture"] = gpu.createKernel(function(m) {
			let res = clamp(m[this.thread.y][this.thread.x], 0, 1)
			this.color(res, res, res)
		})
		.setOutput([m.length, m[0].length])
		.setGraphical(true)
	}
	kernels["RenderToTexture"].setOutput([m.length, m[0].length])
	return createTextureFromCanvas(gl, kernels["RenderToTexture"](m).getCanvas())
}

function createXZPlaneVertices( width, depth, subdivisionsWidth, subdivisionsDepth, _height ) {
  width = width || 1; // OpenGL unit
  depth = depth || 1; // OpenGL unit
  subdivisionsWidth = subdivisionsWidth || 1; // Number of vertices per side
  subdivisionsDepth = subdivisionsDepth || 1; // Number of vertices per side

  const numVertices = (subdivisionsWidth + 1) * (subdivisionsDepth + 1);
  const positions = [];
  const normals = [];
  const texcoords = [];
  const height = _height || [];

  for (let z = 0; z <= subdivisionsDepth; z++) {
    for (let x = 0; x <= subdivisionsWidth; x++) {
      const u = x / subdivisionsWidth;
      const v = z / subdivisionsDepth;
      positions.push(
          width * u - width * 0.5,
          depth * v - depth * 0.5);
	  height.push(0);
      normals.push(0, 1, 0);
      texcoords.push(u, v);
    }
  }

  const numVertsAcross = subdivisionsWidth + 1;
  const indices = [];

  for (let z = 0; z < subdivisionsDepth; z++) {  // eslint-disable-line
    for (let x = 0; x < subdivisionsWidth; x++) {  // eslint-disable-line
      // Make triangle 1 of quad.
      indices.push(
          (z + 0) * numVertsAcross + x,
          (z + 1) * numVertsAcross + x,
          (z + 0) * numVertsAcross + x + 1);

      // Make triangle 2 of quad.
      indices.push(
          (z + 1) * numVertsAcross + x,
          (z + 1) * numVertsAcross + x + 1,
          (z + 0) * numVertsAcross + x + 1);
    }
  }

  const arrays = {
    position: new Float32Array(positions),
    normal: new Float32Array(normals),
    texcoord: new Float32Array(texcoords),
    indices: new Uint32Array(indices),
  };

  return arrays;
}

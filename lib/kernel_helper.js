function setup_terrain_kernel(gpu_instance) {

	let gpu = gpu_instance.gpu
	let kernels = gpu_instance.kernels

	kernels["terrain"] = gpu.createKernel(function(time, oct, persit) {
		let res = octave3D(this.thread.x,this.thread.y, time, oct, persit)
		res *= vignette(this.thread.x/this.output.x, this.thread.y/this.output.y)
		return masking(res, 0.5)
	}, {loopMaxIterations:gpu_instance.loopMaxIterations,})
	.setOutput(gpu_instance.dimension)
	.setOutputToTexture(true)

	kernels["transpose"] = gpu.createKernel(function(m) {
		return m[this.thread.x][this.thread.y];
	})
	.setOutput(gpu_instance.dimension)
	.setOutputToTexture(true);

	kernels["GuassianBlur3x3"] = gpu.createKernel(function(m) {

		let weight = 0.25;
		let total = m[this.thread.y][this.thread.x] * 0.25;

		if ( this.thread.y < this.output.y - 1 ) {
			if ( this.thread.x < this.output.x - 1 ) {
				weight += 0.0625
				total += m[this.thread.y+1][this.thread.x+1] * 0.0625
			}
			if ( this.thread.x > 0 ) {
				weight += 0.0625
				total += m[this.thread.y+1][this.thread.x-1] * 0.0625
			}
			weight += 0.125
			total += m[this.thread.y+1][this.thread.x] * 0.125
		}

		if ( this.thread.y > 0 ) {
			if ( this.thread.x < this.output.x - 1 ) {
				weight += 0.0625
				total += m[this.thread.y-1][this.thread.x+1] * 0.0625
			}
			if ( this.thread.x > 0 ) {
				weight += 0.0625
				total += m[this.thread.y-1][this.thread.x-1] * 0.0625
			}
			weight += 0.125
			total += m[this.thread.y-1][this.thread.x] * 0.125
		}

		if ( this.thread.x < this.output.x - 1 ) {
			weight += 0.125
			total += m[this.thread.y][this.thread.x+1] * 0.125
		}
		if ( this.thread.x > 0 ) {
			weight += 0.125
			total += m[this.thread.y][this.thread.x-1] * 0.125
		}

		return total/weight;

	})
	.setOutput(gpu_instance.dimension)
	.setOutputToTexture(true)

	kernels["GuassianBlur5x5"] = gpu.createKernel(function(m) {

		let weight = 0.25;
		let total = m[this.thread.y][this.thread.x] * 0.25;

		if ( this.thread.y < this.output.y - 1 ) {
			if ( this.thread.x < this.output.x - 1 ) {
				weight += 0.0625
				total += m[this.thread.y+1][this.thread.x+1] * 0.0625
			}
			if ( this.thread.x > 0 ) {
				weight += 0.0625
				total += m[this.thread.y+1][this.thread.x-1] * 0.0625
			}
			weight += 0.125
			total += m[this.thread.y+1][this.thread.x] * 0.125
		}

		if ( this.thread.y > 0 ) {
			if ( this.thread.x < this.output.x - 1 ) {
				weight += 0.0625
				total += m[this.thread.y-1][this.thread.x+1] * 0.0625
			}
			if ( this.thread.x > 0 ) {
				weight += 0.0625
				total += m[this.thread.y-1][this.thread.x-1] * 0.0625
			}
			weight += 0.125
			total += m[this.thread.y-1][this.thread.x] * 0.125
		}

		if ( this.thread.x < this.output.x - 1 ) {
			weight += 0.125
			total += m[this.thread.y][this.thread.x+1] * 0.125
		}
		if ( this.thread.x > 0 ) {
			weight += 0.125
			total += m[this.thread.y][this.thread.x-1] * 0.125
		}

		return total/weight;

	})
	.setOutput(gpu_instance.dimension)
	.setOutputToTexture(true)

	kernels["render"] = gpu.createKernel(function(m) {
		let res = clamp(m[this.thread.y][this.thread.x], 0, 1)
		this.color(res, res, res)
	}, {loopMaxIterations:gpu_instance.loopMaxIterations,})
	.setOutput(gpu_instance.dimension)
	.setGraphical(true);

	//kernels["terrain_render"] = gpu.combineKernels(kernels["render"], kernels["terrain"],function(time, oct, persit) {
	//	return 	kernels["render"](kernels["terrain"](time, oct, persit))
	//});

}

function setup_noise_kernel(gpu_instance) {

	let gpu = gpu_instance.gpu
	let kernels = gpu_instance.kernels

	kernels["noise_texture"] = gpu.createKernel(function(seed) {
		let res = noise3D(this.thread.x/this.output.x*16384.0, this.thread.y/this.output.y*16384.0, seed%131072.0);
		res = clamp(res, 0, 1);
		this.color(res, res, res)
	}, {loopMaxIterations:gpu_instance.loopMaxIterations,})
	.setOutput(gpu_instance.dimension)
	.setGraphical(true);

}

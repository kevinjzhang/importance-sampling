import isSea from './issea.js'

const tolerance = 1e-5
const num_points = 7

// utils.js start

// Translate between latitude longitude and spherical coordinates
function rad_to_lat(coordinate) {
    let res = [0, 0]
    res[0] = coordinate[0] * 180 / Math.PI - 90
    res[1] = coordinate[1] * 180 / Math.PI - 180
    if (res[0] < -90) {
        res[0] += 180
    }
    if (res[1] < -180) {
        res[1] += 360
    }
    return res
}

function lat_to_rad(coordinate) {
    let res = [0, 0]
    res[0] = (coordinate[0] + 90) *  Math.PI / 180 
    res[1] = (coordinate[1] + 180) *  Math.PI / 180 
    return res
}

// Evaluate distance between 2 points in spherical coordinates on a sphere with radius 1
function get_distance_sph(p1, p2) {
    let res = 0
    let c1 = spherical_to_cartesian(p1)
    let c2 = spherical_to_cartesian(p2)
    for (let dim = 0; dim < 3; dim++) {
        res += (c1[dim] - c2[dim]) ** 2
    }
    return Math.sqrt(res)
}

// Get euclidean distance between 2 points
function get_distance(p1, p2) {
    let res = 0
    for (let dim = 0; dim < 3; dim++) {
        res += (p1[dim] - p2[dim]) ** 2
    }
    return Math.sqrt(res)
}

function cartesian_to_spherical(point) {
    let theta = 0
    let phi = 0
    if (Math.abs(point[2]) < 1 - tolerance) {
        theta = Math.acos(point[2])
    }
    if (Math.abs(point[0]) < tolerance && Math.abs(point[1]) > tolerance) {
        phi = Math.asin(point[1] / Math.sin(theta));
    } else if (Math.abs(point[0]) > tolerance && Math.abs(point[1]) < tolerance) {
        phi = Math.asin(point[0] / Math.sin(theta));
    } else if (Math.abs(point[0]) > tolerance && Math.abs(point[1]) > tolerance) {
        phi = Math.atan2(point[1], point[0]);
    }
    // If otherwise then you are at the poles and any value works
    return [theta, phi]
}

function spherical_to_cartesian(point) {
    let x = Math.sin(point[0]) * Math.cos(point[1])
    let y = Math.sin(point[0]) * Math.sin(point[1])
    let z = Math.cos(point[0])
    return [x, y, z]
}

// utils.js end

// beta.js start 

// javascript shim for Python's built-in 'sum'
function sum(nums) {
    var accumulator = 0;
    for (var i = 0, l = nums.length; i < l; i++)
      accumulator += nums[i];
    return accumulator;
  }
  
  // In case you were wondering, the nice functional version is slower.
  // function sum_slow(nums) {
  //   return nums.reduce(function(a, b) { return a + b; }, 0);
  // }
  // var tenmil = _.range(1e7); sum(tenmil); sum_slow(tenmil);
  
  // like betavariate, but more like R's name
  function rbeta(alpha, beta) {
    var alpha_gamma = rgamma(alpha, 1);
    return alpha_gamma / (alpha_gamma + rgamma(beta, 1));
  }
  
  // From Python source, so I guess it's PSF Licensed
  var SG_MAGICCONST = 1 + Math.log(4.5);
  var LOG4 = Math.log(4.0);
  
  function rgamma(alpha, beta) {
    // does not check that alpha > 0 && beta > 0
    if (alpha > 1) {
      // Uses R.C.H. Cheng, "The generation of Gamma variables with non-integral
      // shape parameters", Applied Statistics, (1977), 26, No. 1, p71-74
      var ainv = Math.sqrt(2.0 * alpha - 1.0);
      var bbb = alpha - LOG4;
      var ccc = alpha + ainv;
  
      while (true) {
        var u1 = Math.random();
        if (!((1e-7 < u1) && (u1 < 0.9999999))) {
          continue;
        }
        var u2 = 1.0 - Math.random();
        let v = Math.log(u1/(1.0-u1))/ainv;
        let x = alpha*Math.exp(v);
        var z = u1*u1*u2;
        var r = bbb+ccc*v-x;
        if (r + SG_MAGICCONST - 4.5*z >= 0.0 || r >= Math.log(z)) {
          return x * beta;
        }
      }
    }
    else if (alpha == 1.0) {
      var u = Math.random();
      while (u <= 1e-7) {
        u = Math.random();
      }
      return -Math.log(u) * beta;
    }
    else { // 0 < alpha < 1
      // Uses ALGORITHM GS of Statistical Computing - Kennedy & Gentle
      while (true) {
        var u3 = Math.random();
        var b = (Math.E + alpha)/Math.E;
        var p = b*u3;
        if (p <= 1.0) {
          x = Math.pow(p, (1.0/alpha));
        }
        else {
          x = -Math.log((b-p)/alpha);
        }
        var u4 = Math.random();
        if (p > 1.0) {
          if (u4 <= Math.pow(x, (alpha - 1.0))) {
            break;
          }
        }
        else if (u4 <= Math.exp(-x)) {
          break;
        }
      }
      return x * beta;
    }
  }

// beta.js

// We sample via the Mises–Fisher distribution, initially using random points.
// We do importance sampling and sample each point independently according to 
// its own distribution. Then we do parameter estimation to improve our guess and repeat

// Point clustering (optional optimization): we cycle over clusters and select the nearest point 
// and reorder the points

// Evaluates how spread out the points are using the minimum distance between two points
function get_min_distance(points) {
    let dist = 2;
    for (let i = 0; i < num_points; i++) {
        for (let j = i + 1; j < num_points; j++) {
            dist = Math.min(dist, get_distance(points[i], points[j]))
        }
    }
    return dist
}

function on_land(point) {
    let x = rad_to_lat(cartesian_to_spherical(point))
    let res = isSea(x[0], x[1])
    // console.log(res)
    return !res;
}

function sample_vmf_util(kappa) {
    let dim = 3
    let b = dim / (Math.sqrt(4 * kappa ** 2 + dim ** 2) + 2*kappa)
    let x = (1 - b) / (1 + b)
    let c = kappa*x + dim * Math.log(1-x*x)
    let done = false
    let res = 0
    // console.log(b, x, c, kappa)
    while (!done) {
        let z = rbeta(dim / 2, dim / 2)
        let w = (1 - (1+b)*z) / (1 - (1-b)*z)
        let u = Math.random()
        if (kappa*w + dim*Math.log(1-x*w) - c >= Math.log(u)) {
            done = true
            res = w
        }
    }
    return res
}

function sample_vmf(params) {
    let kappa = params[0]
    let mu = params[1]
    let w = sample_vmf_util(kappa)
    let v = sample_random()
    let res = [0, 0, 0]
    for (let dim = 0; dim < 3; dim++) {
        res[dim] = v[dim] * Math.sqrt(1 - w ** 2) + w * mu[dim]
    }
    let res_mag = norm(res)
    for (let dim = 0; dim < 3; dim++) {
        res[dim] /= res_mag
    }
    return res
}

function sample_random() {
    let p = [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]
    let normal = norm(p)
    for (let dim = 0; dim < 3; dim++) {
        p[dim] /= normal
    }
    return p
}

// Samples 7 points according to params
function sample_sphere(sampling_params, chosen_location, use_chosen_loc) {
    let res = []
    for (let i = 0; i < num_points; i++) {
        if (i == 0 && use_chosen_loc) {
            res.push(chosen_location)
            continue
        }
        let params = sampling_params[i]
        let p = sample_vmf(params)
        let j = 0
        while (!on_land(p)) {
            p = sample_vmf(params)
            j += 1
        }
        res.push(p)
    }
    return res
}

// Gets l2 norm of 3d vector
function norm(vec) {
    let magnitude = 0
    for (let dim = 0; dim < 3; dim++) {
        magnitude += vec[dim] ** 2
    }
    return Math.sqrt(magnitude)
}

// Get the parameter estimates per coordinate
function estimate_params(samples, alpha) {
    let sampling_params = []
    for (let j = 0; j < num_points; j++) {
        // Gets the mean direction
        let mean = [0, 0, 0];
        for (let i = 0; i < alpha; i++) {
            for (let dim = 0; dim < 3; dim++) {
                mean[dim] += samples[i][1][j][dim]
            }
        }
        let magnitude = norm(mean) / alpha
        for (let dim = 0; dim < 3; dim++) {
            mean[dim] /= (alpha * magnitude)
        }
        // Approximate kappa
        let kappa = magnitude * (3 - magnitude ** 2) / (1 - magnitude ** 2)
        sampling_params.push([kappa, mean])
    }
    return sampling_params
}

function find_optimal_locations(lat, long, use_chosen_loc) {
    let num_samples = 2000
    let num_initial_samples = 1000 // Samples used to initialize sampling distribution
    let chosen_location = lat_to_rad([lat, long])
    let location_xyz = spherical_to_cartesian(chosen_location)
    // Initial guess 
    const initial = [[0, 0], [Math.PI, 0], [Math.PI/ 2, 0], [Math.PI/ 2, 2 * Math.PI / 5], 
            [Math.PI/ 2, 4 * Math.PI / 5], [Math.PI/ 2, 6 * Math.PI / 5], [Math.PI/ 2, 8 * Math.PI / 5]]
    let initial_sample = []
    for (let point of initial) {
        initial_sample.push(spherical_to_cartesian([(point[0] + chosen_location[0]) % Math.PI, 
                            (point[1] + chosen_location[1]) % (2 * Math.PI)] ))
    }

    let initial_samples = []
    initial_samples.push([get_min_distance(initial_sample), initial_sample])
    // Get initial sample not in the sea
    for (let i = 0; i < num_initial_samples; i++) {
        let rand_sample = []
        for (let j = 0; j < num_points; j++) {
            if (j == 0 && use_chosen_loc) {
                rand_sample.push(location_xyz)
                continue
            }
            let p = sample_random()
            let i = 0
            while (true) {
                i += 1
                p = sample_random()
                let z = on_land(p)
                if (z) {
                    break
                }
                // console.log(i, p, z)
            }
            rand_sample.push(p)
        }
        initial_samples.push([get_min_distance(rand_sample), rand_sample])
    }

    let alpha = 100 // Number of samples to keep per round
    let num_cycles = 10
    // let best_dist = get_min_distance(initial_sample)
    let best_dist = 0
    let best_coord = initial_sample
    let sampling_params = estimate_params(initial_samples, num_initial_samples + 1)

    for (let t = 0; t < num_cycles; t++) {
        let samples = []
        for (let i = 0; i < num_samples; i++) {
            let sample = sample_sphere(sampling_params, location_xyz, use_chosen_loc)
            samples.push([get_min_distance(sample), sample])
        }
        // Sort in descending order
        samples.sort((a, b) => b[0] - a[0])
        if (samples[0][0] > best_dist) {
            best_dist = samples[0][0]
            best_coord = samples[0][1]
        }
        // Do parameter estimation and update sampling params
        sampling_params = estimate_params(samples, alpha)
        console.log("Iteration: ", t, " dist: ", best_dist, " sample: ", "[]")
    }
    return [best_coord, best_dist]
}

export function run(lat, long) {
    let best_score = 0
    let best_coord = []
    let best_xyz = []
    let num_tries = 4
    for (let i = 0; i < num_tries; i++) {
        let res = find_optimal_locations(lat, long, true)
        let coord = res[0]
        let dist = res[1]
        let lat_long = []
        for (let i = 0; i < num_points; i++) {
            lat_long.push(rad_to_lat(cartesian_to_spherical(coord[i])))
        }
        if (dist > best_score) {
            best_score = dist
            best_coord = lat_long
            best_xyz = coord
        }
        // console.log("cycle: ", i, " dist: ", dist)
    }
    console.log("running important sampling", best_coord, best_score, best_xyz)
    return best_coord
}

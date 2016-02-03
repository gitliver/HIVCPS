
/* -----------------------------------
find the number of unique sequences in an alignment based on
limited substrings of each sequence vs. the whole sequence.

the goal here is to determine the optimal subsequence (i.e. primer set) for
suggesting clonality.
----------------------------------- */

function setUp() {
	// Initialize basics ...

	console.log('Testing 1 2 3');
	// console.log(hxb2s_data);
	// console.log(align_data);
	// x = new PrimerSet('asdf', [10,40], [100,250]);
	// x.set_hxb2(1,2,3,4);
	// console.log(x);
	// usage example:
	// var a = [4, 'a', 1, 'a', 2, '1', 4, 4];
	// var unique = a.filter( onlyUnique ); // returns ['a', 1, 2, '1']
	// console.log(a);
	// console.log(unique);

}

// JavaScript PrimerSet class
function PrimerSet(name, f, r) {
	// this seems easier and more robust than keeping track of these some other way,
	// basically important when evaluating multiple primer sets simultaneously.
	// instantiate with parameters provided. f and r are tuples with start and
	// end coordinates, based on hxb2. name is a string.

	this.f = f;
	this.r = r;
	this.f_len = f[1]-f[0];
	this.r_len = r[1]-r[0];
	this.name = name;

	this.set_hxb2 = function(f_start, f_end, r_start, r_end) {
		this.hxb2f = [f_start, f_end];
		this.hxb2r = [r_start, r_end];
	};
}

// JavaScript SeqCounts class
function SeqCounts(t, d, u, ua) {
	// a class for defining a seq count object, which stores four different counts

	this.total = t;
	this.detectable = d;
	this.unique = u;
	this.unique_amp = ua;
}

function generateArray(mylength, mystep) {
	// return an array, given the length and step

	var x = [];

	for (var i = 0; i < mylength; i += mystep) {
		x.push(i);
	}

	return x;
} 

function getCount(myarray, myvalue) {
	// for an array, implement the Python count function

	var count = 0;
	for(var i = 0; i < myarray.length; i++){
		if (myarray[i] == myvalue) {
			count++;
		}
	}

	return count;
} 

function onlyUnique(value, index, self) { 
	// http://stackoverflow.com/questions/1960473/unique-values-in-an-array
	return self.indexOf(value) === index;
}

function slidingWindow(width, step, primer_width) {
	// calculate clonality within a sliding window of fixed width across the 
	// genome (and print to file through accessory methods)

	console.log('width');
	console.log(width);
	console.log('step');
	console.log(step);
	console.log('primer_width');
	console.log(primer_width);

	// come up with a list of "primer sites" to test. 
	// the reverse "primer" will be the f_site plus the window width.
	var hxb2_length = 9716;
	console.log('hxb2_length');
	console.log(hxb2_length);

	var f_sites = generateArray(hxb2_length-width - primer_width - 1, step);
	f_sites.push(hxb2_length-width - primer_width - 1);
	console.log('f_sites');
	console.log(f_sites);

	// convert to the PrimerSet format for count_sequences
	var primers = [];
	for (var i = 0; i < f_sites.length; i++) {
		primers.push(new PrimerSet('', [f_sites[i], f_sites[i] + primer_width], [f_sites[i] + width, f_sites[i] + width + primer_width]))
	}
	console.log(primers)

	// storage for all of these parameters for all of the patients
	var f_primer_lists = [];
	var total_lists = [];
	var detectable_lists = [];
	var unique_lists = [];
	var unique_amp_lists = [];
	var p_amp_lists = [];
	var p_det_lists = [];

	// now to the meat of the method...
	// loop through keys (i.e., patients)
	// key --> p
	for (var key in align_data) {
		if (align_data.hasOwnProperty(key)) {
			console.log('calculating patient ' + key);

			// store output
			var f_primer_list = [];
			var total_list = [];
			var detectable_list = [];
			var unique_list = [];
			var unique_amp_list = [];
			var p_amp_list = [];
			var p_det_list = [];

			// loop through primers
			for (var i = 0; i < primers.length; i++) {
				// total, detectable, unique, unique_amp = count_sequences(p, alignments[p], hxb2s[p], [primer])
				var mycounts = count_sequences(key, align_data[key], hxb2s_data[key], [primers[i]])
				// check if it's right
				if (i == 10 || i == 100) {
					console.log('res1');
					console.log(mycounts);
				}
			}

		}
	}

}

function count_sequences(name, sequences, hxb2, primers) {
	/*
	input: the sequence alignment and associated hxb2 coordinates (and name) of a
	single patient, plus the hxb2 coordinates of primer set(s) of interest

	output:
		- the number of unique sequences in the alignment (total)
		- the number of these sequences that would be detectable in a PCR with
		those primers (i.e. no gaps overlapping the primer sites--assume if the
		sequences align, there's enough homology)
		- the number of unique sequences considering only the region between and
		NOT including those PCR primer binding sites
		- the number of sequences that are both unique AND detectable by that PCR
	*/

	// convert hxb2 coordinates to alignment coordinates
	for (var i = 0; i < primers.length; i++) {
		var f_start = hxb2.indexOf(primers[i].f[0]);
		var f_end = hxb2.indexOf(primers[i].f[1]);
		var r_start = hxb2.indexOf(primers[i].r[0]);
		var r_end = hxb2.indexOf(primers[i].r[1]);
		primers[i].set_hxb2(f_start, f_end, r_start, r_end);
	}

	// output 1: total number of sequences
	var total = sequences.length;
	// console.log(total);

	// output 2: number of sequences that are detectable by PCR
	var amplicons = [];
	// Python:
	// for s in sequences:
	// 	if all([s[p.hxb2f[0]:p.hxb2f[1]].count('-')==0 and s[p.hxb2r[0]:p.hxb2r[1]].count('-')==0 and p.hxb2f[1] - p.hxb2f[0] == p.f_len and p.hxb2r[1] - p.hxb2r[0] == p.r_len for p in primers]):
	// 		amplicons += ['*'.join([s[p.hxb2f[1]:p.hxb2r[0]] for p in primers])]

	for (var i = 0; i < sequences.length; i++) {
		var mybool = 1
		for (var j = 0; j < primers.length; j++) {
			if (!( getCount(sequences[i].slice(primers[j].hxb2f[0],primers[j].hxb2f[1]), '-') == 0 && 
				getCount(sequences[i].slice(primers[j].hxb2r[0],primers[j].hxb2r[1]), '-') == 0 && 
				primers[j].hxb2f[1] - primers[j].hxb2f[0] == primers[j].f_len && 
				primers[j].hxb2r[1] - primers[j].hxb2r[0] == primers[j].r_len
			)) {
				mybool = 0;
			}
		}
		if (mybool == 1) {
			var tmparray = []
			for (var j = 0; j < primers.length; j++) {
				tmparray.push(sequences[i].slice(primers[j].hxb2f[1],primers[j].hxb2r[0]))
			}
			amplicons.push(tmparray.join('*'));
		}
	}
	var detectable = amplicons.length;
	// check if we got it right:
	// if (name == 'PIC11286') {
	// 	if (primers[0].f[0] == 8000) {
	// 		console.log(amplicons);
	// 	}
	// }

	// output 3: number of unique sequences (ignoring actual detectability)
	// Python:
	// amp_ignore_gaps = ['*'.join([s[p.hxb2f[1]:p.hxb2r[0]] for p in primers]) for s in sequences]
	// for s in sequences:
	//     '*'.join( [s[p.hxb2f[1]:p.hxb2r[0]] for p in primers] )
	var amp_ignore_gaps = [];
	for (var i = 0; i < sequences.length; i++) {
		var tmparray = []
		for (var j = 0; j < primers.length; j++) {
			tmparray.push(sequences[i].slice(primers[j].hxb2f[1],primers[j].hxb2r[0]))
		}
		amp_ignore_gaps.push(tmparray.join('*'));
	}
	var unique = amp_ignore_gaps.filter(onlyUnique).length;
	// check if we got it right:
	// if (name == 'PIC11286') {
	// 	if (primers[0].f[0] == 8000) {
	// 		console.log(amp_ignore_gaps.filter(onlyUnique).length);
	// 		console.log(amp_ignore_gaps.filter(onlyUnique));
	// 	}
	// }

	//output 4: number of unique, detectable sequences
	var unique_amp = amplicons.filter(onlyUnique).length;

	var myReturnVal = new SeqCounts(total, detectable, unique, unique_amp);
	return myReturnVal;
	// return {
	// 	'total': total,
	// 	'detectable': detectable,
	// 	'unique': unique,
	// 	'unique_amp': unique_amp
	// }

}

setUp();
slidingWindow(1000, 10, 10);

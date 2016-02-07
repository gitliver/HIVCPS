#!/usr/bin/env python

################################################################################
#
# find the number of unique sequences in an alignment based on 
# limited substrings of each sequence vs. the whole sequence.
#
# the goal here is to determine the optimal subsequence (i.e. primer set) for 
# suggesting clonality.
# 
# all of the data in this paper were generated using this script.  see runtime
# commands at the bottom of the file for more detail.
#
# primers6.py is a combination of the updates found in primers4 and primers5.
#
# 3 September 2015
#
################################################################################

# what we need
import math
import string
import os
import numpy

################################################################################
# class(es)
################################################################################

class PrimerSet:
   '''
   this seems easier and more robust than keeping track of these some other way,
   basically important when evaluating multiple primer sets simultaneously.  
   '''
   
   def __init__(self, name, f, r):
      '''
      instantiate with parameters provided.  f and r are tuples with start and 
      end coordinates, based on hxb2.  name is a string.
      '''

      self.f = f
      self.r = r
      self.f_len = f[1]-f[0]
      self.r_len = r[1]-r[0]
      self.name = name

   def set_hxb2(self, f_start, f_end, r_start, r_end):
      self.hxb2f = (f_start, f_end)
      self.hxb2r = (r_start, r_end)


################################################################################
# input method(s)
################################################################################

def same_letter(a, b, count):
   '''
   given two nts, increment counter if they're not the same.  if one is N and 
   the other is in {A, T, C, G}, then they count as the same.
   '''

   if a == b: return count

   if a == '*' or b == '*': return count

   if a == 'N' and b in ['A', 'T', 'C', 'G']: return count

   if b == 'N' and a in ['A', 'T', 'C', 'G']: return count

   return count + 1

def parse_patients(dir, keep_duplicates):
   '''
   given a directory containing fasta files, read through them.  each file 
   contains sequences from a single patient aligned to hxb2.  the sequences are 
   saved as a list of strings, plus an accompanying list of associated hxb2
   coordinates.  (both are returned as dictionaries with patient names as keys.)
   '''

   # where we'll store the output
   alignments = {}
   hxb2s = {}

   list_of_files = os.listdir(dir)
   list_of_files = [f for f in list_of_files if not 'DS_Stor' in f]

   for f in list_of_files:

      # read in the file
      reader = open(dir + f)
      lines = reader.readlines()
      reader.close()

      # patient number/designation
      patient_name = f[:f.find(' ')]
      print 'parsing patient', patient_name

      # first line (i.e. name) of each sequence--relies on fasta formatting
      firsts = [i for i,j in enumerate(lines) if j[0]=='>']
      sequence_names = [j for j in lines if j[0]=='>']
      firsts += [len(lines)] # for parsing (below)

      print '   ', len(firsts)-2, 'sequences (not including hxb2)'

      if len(sequence_names) != len(list(set(sequence_names))):
         print '    WARNING: duplicate sequence names for patient', patient_name
         raise Exception

      # now concatenate lines to get the sequences
      sequences = []
      for i in range(len(firsts)-1):
         sequences += [''.join(lines[firsts[i]+1:firsts[i+1]])]

      # remove unwanted characters, translate all gaps to '-'
      sequences = [s.upper() for s in sequences]
      temp = string.maketrans('~RYMKW', '-NNNNN')
      sequences = [s.translate(temp, '\r\n') for s in sequences]

      # replace dashes at the beginning and end of a sequence with asterisks (to
      # differentiate between sequencing coverage vs. gaps)
      new_sequences = []
      for s in sequences:
         temp = list(s)
         i = 0
         while temp[i] == '-':
            temp[i] = '*'
            i += 1
         i = len(temp) - 1
         while temp[i] == '-':
            temp[i] = '*'
            i -= 1
         new_sequences += [''.join(temp)]
      sequences = new_sequences

      # fix width of alignment (add asterisks to the end of short sequences)
      max_seq_length = max([len(s) for s in sequences])
      sequences = [s + '*'*(max_seq_length-len(s)) for s in sequences]

      # remove gaps that appear in every sequence in the alignment (why do they
      # even exist??? UGH.)
      universal_gaps = []
      for i in range(max_seq_length):
         is_gap = True
         for s in sequences:
            if s[i] != '-': is_gap = False
         if is_gap: universal_gaps += [i]
      if len(universal_gaps) > 0:
         print '     removing', len(universal_gaps), 'alignment gaps...'
         sequences = [''.join([n for i, n in enumerate(s)
                                            if not i in universal_gaps]) 
                                                             for s in sequences]

      # which sequence is hxb2?
      names = [lines[i] for i in firsts[:-1]]
      hxb2 = [i for i,n in enumerate(names) if ('hxb2' in n) or ('HXB2') in n]

      if len(hxb2) != 1: 
         print 'WARNING: wrong number of reference sequences for patient', \
                                      patient_name, ':', len(hxb2)
         raise Exception
      else: hxb2 = hxb2[0]

      # parse hxb2 to be of use for later
      hxb2_seq = sequences[hxb2]
      hxb2_index = [i - hxb2_seq[0:i].count('-') for i,l in enumerate(hxb2_seq)]

      hxb2_index = ['-' if hxb2_seq[i]=='-' else h for i,h in enumerate(hxb2_index)]

      # now remove hxb2 from the alignment
      sequences.remove(hxb2_seq)

      if not keep_duplicates:

         # remove repeat sequences so each sequence in the set is unique
         old_length = len(sequences)
         sequences = list(set(sequences))
         temp = old_length - len(sequences)
         if temp > 0: 
            print '     removed', temp, 'perfect duplicate sequence(s)'

         # remove duplicate sequences where only sequence differences are N's 
         # aligned to other letters (this may get slow...) -- also, this 
         # considers any sequences with 2 or fewer mismatches to be identical
         # (to account for sequencing/PCR error).
         duplicates = []
         for i, s1 in enumerate(sequences):
            for j in range(i+1, len(sequences)):
               s2 = sequences[j]
               mismatches = 0
               k = 0
               while mismatches < 3:
                  try: mismatches = same_letter(s1[k], s2[k], mismatches)
                  except IndexError:
                     duplicates += [i]
                     mismatches = 10 # arbitrary big number
                  else: k += 1

         duplicates = sorted(list(set(duplicates)))
         if len(duplicates) > 0:
            print '     removing', len(duplicates), 'duplicate sequence(s)'
            for i,j in enumerate(duplicates): sequences.pop(j-i)

      # translate *s back to -s for ease of later analysis
      temp = string.maketrans('*', '-')
      sequences = [s.translate(temp) for s in sequences]

      # finally, store your beautifully curated sequences.
      alignments[patient_name] = sequences
      hxb2s[patient_name] = hxb2_index

      print '   ', len(sequences), 'sequences in final alignment'

      # debug code to print out specific patient sequence by hxb2 coordinates
      '''
      if patient_name=='K04':
         print hxb2_seq[hxb2_index.index(7000):hxb2_index.index(7200)]
         for s in sequences: 
            print s[hxb2_index.index(7000):hxb2_index.index(7200)]
      '''

   # save the data structures to be read in Javascript
   # myname = 'alignments'

   # with open('hxb2s_dump.js', 'w') as f:
   #    f.write('var hxb2s_data = ')
   #    f.write(str(hxb2s))
   #    f.write('\n')

   # with open(myname + '_dump.js', 'w') as f:
   #    f.write('var ' + myname + '_data = ')
   #    f.write(str(alignments))
   #    f.write('\n')

   return alignments, hxb2s


################################################################################
# number crunching
################################################################################

def count_sequences(name, sequences, hxb2, primers):
   '''
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
   '''

   #print
   #print 'analyzing patient', name, 'against primer set:', primer_f, primer_r

   # convert hxb2 coordinates to alignment coordinates
   for p in primers:
      f_start = hxb2.index(p.f[0])
      f_end = hxb2.index(p.f[1])
      r_start = hxb2.index(p.r[0])
      r_end = hxb2.index(p.r[1])
      p.set_hxb2(f_start, f_end, r_start, r_end)

   # output 1: total number of sequences
   total = len(sequences)

   # output 2: number of sequences that are detectable by PCR
   amplicons = []
   for s in sequences:
      if all([s[p.hxb2f[0]:p.hxb2f[1]].count('-')==0 and
              s[p.hxb2r[0]:p.hxb2r[1]].count('-')==0 and
              p.hxb2f[1] - p.hxb2f[0] == p.f_len and
              p.hxb2r[1] - p.hxb2r[0] == p.r_len
              for p in primers]):
         amplicons += ['*'.join([s[p.hxb2f[1]:p.hxb2r[0]] for p in primers])]
   detectable = len(amplicons)

   # output 3: number of unique sequences (ignoring actual detectability)
   amp_ignore_gaps = ['*'.join([s[p.hxb2f[1]:p.hxb2r[0]] for p in primers])
                      for s in sequences]
   unique = len(set(amp_ignore_gaps))

   # output 4: number of unique, detectable sequences
   unique_amp = len(set(amplicons))

   # debug code to verify detectable calculation
   '''
   if True:
      print
      print name
      print primer_f, primer_r
      for s in sequences:
         print
         print s[f_start:f_end]
         print s[r_start:r_end]
   '''

   return total, detectable, unique, unique_amp


def run_primer_set(alignments, hxb2s, primers):
   '''
   given all the patient alignments and specified primer sets (by name and
   hxb2 coordinates), print to file the four quantities calculated in 
   count_sequences for every patient.

   this method works for one OR MORE primer sets simultaneously. primers is
   a list of Primer objects.  (see definition in 'classes' section.)
   '''

   name = '_'.join([p.name for p in primers])
   writer = open(name + '.txt', 'w')

   # heading
   writer.write('patient' + '\t' + 
                'total' + '\t' + 
                'detectable' + '\t' + 
                'unique' + '\t' + 
                'uniqe amp' + '\t' + 
                '%amp' + '\t' + 
                '%det' + '\n')

   patients = sorted(hxb2s.keys())

   for p in patients:
      total, detectable, unique, unique_amp = count_sequences(
                p, alignments[p], hxb2s[p], primers)

      # calculate proportions...
      if detectable > 0: p_amp = 1.0 * unique_amp / detectable
      else: p_amp = None
      p_det = 1.0 * detectable / total

      writer.write('\n')
      writer.write(p + '\t' +
                str(total) + '\t' +
                str(detectable) + '\t' +
                str(unique) + '\t' +
                str(unique_amp) + '\t' +
                str(p_amp) + '\t' +
                str(p_det) + '\n') 

   writer.close()


def write_full_genome(patient_name, window_width, step, primer_width,
                primers, total, detectable, unique, unique_amp, p_amp, p_det):
   '''
   print out the results of sliding_window for given patient and window
   parameters.  this prints out the basic parameters for every primer set
   calculated, across the genome.
   '''

   # file to write
   outfile = patient_name + \
             ' full genome ' + \
             str(window_width) + \
             '_' + str(primer_width) + \
             '.txt'
   writer = open(outfile, 'w')

   # headings and metadata
   writer.write('\n')
   writer.write('patient ' + patient_name + '\n')
   writer.write('window width = ' + str(window_width) + 'bp\n')
   writer.write('step size = ' + str(step) + 'bp\n')
   writer.write('primer width = ' + str(primer_width) + 'bp\n\n')

   writer.write('F primer coord' + '\t' +
                'total seqs' + '\t' +
                'detectable' + '\t' +
                'unique' + '\t' +
                'unique amp' + '\t' +
                '%amp' + '\t' +
                '%det' + '\n')

   for i in zip(primers, total, detectable, unique, unique_amp, p_amp, p_det):
      writer.write('\t'.join([str(j) for j in i]) + '\n')

   writer.close()


def write_pamp_genome_summary(window_width, p_amp_lists):
   '''
   given the results from sliding_window for all patients, calculate some
   summary statistics for %amp (aka clonal prediction score) across the
   genome.
   '''

   # file to write
   outfile = str(window_width) + 'bp %amp summary.txt'
   writer = open(outfile, 'w')

   writer.write('patient' + '\t' +
                'mean' + '\t' +
                'med' + '\t' +
                'min' + '\t' +
                '%>80 (det)' + '\t' +
                '%>80 (all)' + '\n')

   # list of patients (sorted for convenience)
   patients = sorted(p_amp_lists.keys())

   # iterate over patients
   for p in patients:

      # this patient's clonal prediction scores across the genome
      p_amp_list = p_amp_lists[p]

      #store things to print
      try: p_mean = str(numpy.mean([a for a in p_amp_list if a]))
      except ValueError: p_mean = ''

      try: p_median = str(numpy.median([a for a in p_amp_list if a]))
      except ValueError: p_median = ''

      try: p_min = str(numpy.min([a for a in p_amp_list if a]))
      except ValueError: p_min = ''

      n_detectable = len([a for a in p_amp_list if a])
      if n_detectable == 0: p_det_over_80 = ''
      else:
         p_det_over_80 =  \
             str(1.0*len([a for a in p_amp_list if a>=0.8])/n_detectable)

      p_all_over_80 = \
          str(1.0*len([a for a in p_amp_list if a>=0.8])/len(p_amp_list))

      writer.write(p + '\t' +
                   p_mean + '\t' +
                   p_median + '\t' +
                   p_min + '\t' +
                   p_det_over_80 + '\t' +
                   p_all_over_80 + '\n')

   writer.close()


def write_pdet_genome_summary(window_width, p_det_lists):
   '''
   given the results from sliding_window for all patients, calculate some
   summary statistics for PCR coverage across the genome.
   '''

   # file to write
   outfile = str(window_width) + 'bp %det summary.txt'
   writer = open(outfile, 'w')

   writer.write('patient' + '\t' +
                'mean' + '\t' +
                '% > 0' + '\n')

   # list of patients (sorted for convenience)
   patients = sorted(p_det_lists.keys())

   # iterate over patients
   for p in patients:

      # this patient's % detected across the genome
      p_det_list = p_det_lists[p]

      #store things to print
      try: p_mean = str(numpy.mean(p_det_list))
      except ValueError: p_mean = ''

      try: det_nonzero = str(1.0 * sum([1 for a in p_det_list if a>0]) 
                                                          / len(p_det_list))
      except ValueError: det_nonzero = ''

      # write the things to file
      writer.write(p + '\t' + 
                   p_mean + '\t' +
                   det_nonzero + '\n')

   writer.close()


def sliding_window(alignments, hxb2s, width, step, primer_width=10):
   '''
   calculate clonality within a sliding window of fixed width across the 
   genome (and print to file through accessory methods)
   '''
   print 'beginning sliding window analysis with width', width, \
                                                 'and step size', step, '...'   

   # also important
   print 'primer width =', primer_width

   # come up with a list of "primer sites" to test. the reverse "primer" will be
   # the f_site plus the window width.
   hxb2_length = 9716
   f_sites = range(0, hxb2_length-width-primer_width-1, step)
   f_sites += [hxb2_length-width-primer_width-1]
   
   # convert to the PrimerSet format for count_sequences
   primers = [PrimerSet('', (f, f + primer_width),
                            (f + width, f + width + primer_width))
                        for f in f_sites]

   # storage for all of these parameters for all of the patients
   f_primer_lists = {}
   total_lists = {}
   detectable_lists = {}
   unique_lists = {}
   unique_amp_lists = {}
   p_amp_lists = {}
   p_det_lists = {}

   # now to the meat of the method...
   for p in alignments.keys():

      print '   calculating patient', p

      # store output
      f_primer_list = []
      total_list = []
      detectable_list = []
      unique_list = []
      unique_amp_list = []
      p_amp_list = []
      p_det_list = []

      for counter, primer in enumerate(primers):
         total, detectable, unique, unique_amp = count_sequences(
                      p, alignments[p], hxb2s[p], [primer])

         # calculate %amp
         try: p_amp = 1.0*unique_amp/detectable
         except ZeroDivisionError: p_amp = None

         # store the results for this primer set
         f_primer_list += [primer.f[0]]
         total_list += [total]
         detectable_list += [detectable]
         unique_list += [unique]
         unique_amp_list += [unique_amp]
         p_amp_list += [p_amp]
         p_det_list += [1.0*detectable/total]

      # now store all the results for this patient.  so much storage.
      f_primer_lists[p] = f_primer_list
      total_lists[p] = total_list
      detectable_lists[p] = detectable_list
      unique_lists[p] = unique_list
      unique_amp_lists[p] = unique_amp_list
      p_amp_lists[p] = p_amp_list
      p_det_lists[p] = p_det_list

      # print data for figs 1 and s1
      write_full_genome(p, width, step, primer_width,
                        f_primer_list,
                        total_list,
                        detectable_list,
                        unique_list,
                        unique_amp_list,
                        p_amp_list,
                        p_det_list)

   # print data for figs 2, S4
   #write_pamp_genome_summary(width, p_amp_lists)

   # print data for fig 3
   #write_pdet_genome_summary(width, p_det_lists)


################################################################################
# store all input
################################################################################

seq_directory = os.getcwd() + '/alignmentsv5/use these/'
hypermut_directory = os.getcwd() + '/alignmentsv5/hypermuts only/'
no_hypermut_directory = os.getcwd() + '/alignmentsv5/no hypermuts/'
alt_gaps_directory = os.getcwd() + '/alignmentsv5/alternate gaps/'

alignments, hxb2s = parse_patients(seq_directory, False)
#full_alignments, hxb2s = parse_patients(seq_directory, True)
#hypermut_alignments, hxb2s = parse_patients(hypermut_directory, False)
#no_hypermut_alignments, hxb2s = parse_patients(no_hypermut_directory, False)
# alt_gaps_alignments, hxb2s = parse_patients(alt_gaps_directory, False)


print
print 'input data parsed'
print
print('keys')
print(alignments.keys())
print(hxb2s.keys())

# hxb2 coordinates of some popular primer sets
kearney_f = (1870,1894)
kearney_r = (3409,3435)
nina_env_f = (7014,7032)
nina_env_r = (7510,7530)
wagner_f = (7001,7021)
wagner_r = (7647,7668)
evering_f = (5956,5983)
evering_r = (8881,8904)
jrb1_f = (2056,2080)
jrb1_r = (2568,2593)
jrb2_f = (2200,2243)
jrb2_r = (2596,2616)
palmer_f = (1298,1323)
palmer_r = (1358,1377)
jrb3_f = (2598,2616)
jrb3_r = (3244,3262)
jrb4_f = (7059,7081)
jrb4_r = (7510,7530)


################################################################################
# runtime commands
################################################################################

# there's a lot of redundancy here--when all of the writing methods in 
# sliding_window() are uncommented, one run will produce the data for most
# figures.

# figs 1, s1
#sliding_window(alignments, hxb2s, 1000, 10)

# fig 2
'''
sliding_window(alignments, hxb2s, 100, 10)
sliding_window(alignments, hxb2s, 250, 10)
sliding_window(alignments, hxb2s, 500, 10)
sliding_window(alignments, hxb2s, 1000, 10)
sliding_window(alignments, hxb2s, 2000, 10)
sliding_window(alignments, hxb2s, 3000, 10)
sliding_window(alignments, hxb2s, 6000, 10)
'''

# fig 3
'''
sliding_window(alignments, hxb2s, 500, 10)
sliding_window(alignments, hxb2s, 1000, 10)
sliding_window(alignments, hxb2s, 3000, 10)
sliding_window(alignments, hxb2s, 6000, 10)
'''

# figs 4, s3
print('run primer set')
run_primer_set(alignments, hxb2s, [PrimerSet('p6-gag-pro', kearney_f, kearney_r)])
run_primer_set(alignments, hxb2s, [PrimerSet('env 667', wagner_f, wagner_r)])
'''
run_primer_set(alignments, hxb2s, [PrimerSet('p6-gag-pro', kearney_f, kearney_r)])
run_primer_set(alignments, hxb2s, [PrimerSet('env 667', wagner_f, wagner_r)])
run_primer_set(alignments, hxb2s, [PrimerSet('env 2948', evering_f, evering_r)])
run_primer_set(alignments, hxb2s, [PrimerSet('pro', jrb1_f, jrb1_r)])
run_primer_set(alignments, hxb2s, [PrimerSet('pol 416', jrb2_f, jrb2_r)])
run_primer_set(alignments, hxb2s, [PrimerSet('gag (SCA)', palmer_f, palmer_r)])
run_primer_set(alignments, hxb2s, [PrimerSet('pol 664', jrb3_f, jrb3_r)])
run_primer_set(alignments, hxb2s, [PrimerSet('env 471', jrb4_f, jrb4_r)])
'''

# supplementary figure - effect of primer length on fig 1 output
'''
sliding_window(alignments, hxb2s, 1000, 10)
sliding_window(alignments, hxb2s, 1000, 10, 15)
sliding_window(alignments, hxb2s, 1000, 10, 20)
sliding_window(alignments, hxb2s, 1000, 10, 30)
'''

# supplementary figure - hypermutants are easily distinguishable
'''
sliding_window(hypermut_alignments, hxb2s, 100, 10)
sliding_window(hypermut_alignments, hxb2s, 200, 10)
sliding_window(hypermut_alignments, hxb2s, 300, 10)
sliding_window(hypermut_alignments, hxb2s, 400, 10)
sliding_window(hypermut_alignments, hxb2s, 500, 10)

sliding_window(no_hypermut_alignments, hxb2s, 100, 10)
sliding_window(no_hypermut_alignments, hxb2s, 200, 10)
sliding_window(no_hypermut_alignments, hxb2s, 300, 10)
sliding_window(no_hypermut_alignments, hxb2s, 400, 10)
sliding_window(no_hypermut_alignments, hxb2s, 500, 10)
'''

# supplementary figure - alignments gapped differently
# sliding_window(alt_gaps_alignments, hxb2s, 1000, 10)
# sliding_window(alignments, hxb2s, 1000, 10)

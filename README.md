[![DOI](https://zenodo.org/badge/365926796.svg)](https://zenodo.org/badge/latestdoi/365926796)

# [SafFire](https://mrvollger.github.io/SafFire/)

[SafFire](https://mrvollger.github.io/SafFire/) is an interactive tool for visualizing Miropeats genome wise.

Please visit the website to use: [https://mrvollger.github.io/SafFire/](https://mrvollger.github.io/SafFire/)

## How to prepare your genome alignment for SafFire

To prepare PAF alignments for SafFire, you will need to install [rustybam](https://mrvollger.github.io/rustybam/). Once installed you can use the following command to convert your PAF file into a format that SafFire can read:

```bash
rb trim-paf {input.paf} `#trims back alignments that align the same query sequence more than once` \
    | rb break-paf --max-size 5000 `#breaks the alignment into smaller pieces on indels of 5000 bases or more` \
    | rb orient `#orients each contig so that the majority of bases are forward aligned` \
    | rb filter --paired-len 100000 `#filters for query sequences that have at least 100,000 bases aligned to a target across all alignments.` \
    | rb stats --paf `#calculates statistics from the trimmed paf file` \
    > {input.for.saffire}
```

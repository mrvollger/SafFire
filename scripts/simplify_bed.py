#!/usr/bin/env python
import pybedtools
import sys
import pandas as pd
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="", formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument("bed", help="bedfile")
    parser.add_argument(
        "-d",
        "--group",
        help="set to group items together and merge items within this distance",
        type=int,
        default=None,
    )
    parser.add_argument(
        "-m",
        "--min-merge",
        help="min number of shared names to group.",
        type=int,
        default=2,
    )
    # parser.add_argument(
    #    "-d", help="store args.d as true if -d", action="store_true", default=False
    # )
    args = parser.parse_args()

    df = pd.read_csv(args.bed, sep="\t")
    df = df[df["name"].str.match(r".+(\.\d+)|(^LINC\d+).*") == False]
    df["name"] = df["name"].str.replace(r"-.*", "")
    bed = pybedtools.BedTool().from_dataframe(df)
    group_cols = ["#ct", "name", "strand"]
    n_groups = df[group_cols].drop_duplicates().shape[0]
    sys.stderr.write(f"{n_groups} groups\n")
    # header
    print("\t".join(df.columns))
    unmerged_rows = []
    idx = 0
    for name, group in df.groupby(group_cols):
        # print(group)
        if args.group is not None:
            if group.shape[0] >= args.min_merge:
                bed = pybedtools.BedTool().from_dataframe(group)
                c = [4, 5, 6, 7, 8, 9]
                d = ["name", "score", "strand", "tst", "ten", "color"]
                o = ["first", "first", "first", "min", "max", "first"]
                merge = bed.merge(d=args.group, c=c, o=o, s=True, stream=True)
                print(merge, end="")
            else:
                unmerged_rows += list(group.index)
        else:  # simplify
            largest = (group.en - group.st).idxmax()
            # print(largest, file=sys.stderr)
            unmerged_rows.append(largest)

        idx += 1
        sys.stderr.write(f"\rGroup #: {idx/n_groups:.2%}")
    # print(unmerged_rows, file=sys.stderr)
    df.loc[unmerged_rows].to_csv(sys.stdout, sep="\t", index=False, header=False)
    sys.stderr.write("\n")

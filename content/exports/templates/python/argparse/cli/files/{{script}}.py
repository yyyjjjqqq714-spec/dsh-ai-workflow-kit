#!/usr/bin/env python3
"""{{script}} —— 命令行入口。"""

from __future__ import annotations

import argparse
import logging
import sys

log = logging.getLogger("{{script}}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="{{script}}", description="{{script}} 命令行工具")
    p.add_argument("--input", required=True, help="输入路径")
    p.add_argument("--output", default="./out", help="输出目录（默认 ./out）")
    p.add_argument("--dry-run", action="store_true", help="只打印计划，不写文件")
    p.add_argument("-v", "--verbose", action="store_true", help="输出调试日志")
    return p


def run(args: argparse.Namespace) -> int:
    log.info("input=%s output=%s dry_run=%s", args.input, args.output, args.dry_run)
    if args.dry_run:
        log.info("dry run，未写入")
        return 0
    # TODO: 实现实际逻辑
    return 0


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    try:
        return run(args)
    except Exception as exc:  # noqa: BLE001
        log.exception("执行失败: %s", exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())

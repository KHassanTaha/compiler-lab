"""Pre-loaded example programs, served via ``GET /examples``.

Each entry is a plain dict so the router can return it without a schema
layer. The ``expected`` field tells the frontend what a correct run looks
like, which the screenshot script and the docs page rely on.
"""

EXAMPLES: list[dict] = [
    {
        "id": "hello",
        "title": "Hello ZubaanScript",
        "category": "valid",
        "expected": "All success",
        "code": 'likho("Namaste, ZubaanScript!");',
    },
    {
        "id": "factorial",
        "title": "Factorial with loop",
        "category": "valid",
        "expected": "All success",
        "code": (
            "kaam factorial(n: int) -> int {\n"
            "    int result = 1;\n"
            "    int i = 1;\n"
            "    jabtak (i <= n) {\n"
            "        result = result * i;\n"
            "        i = i + 1;\n"
            "    }\n"
            "    wapas result;\n"
            "}\n"
            "int answer = factorial(5);\n"
            "likho(answer);"
        ),
    },
    {
        "id": "fibonacci",
        "title": "Fibonacci function",
        "category": "valid",
        "expected": "All success",
        "code": (
            "kaam fib(n: int) -> int {\n"
            "    agar (n < 2) {\n"
            "        wapas n;\n"
            "    }\n"
            "    wapas fib(n - 1) + fib(n - 2);\n"
            "}\n"
            "likho(fib(10));"
        ),
    },
    {
        "id": "types_demo",
        "title": "Type declarations tour",
        "category": "valid",
        "expected": "All success",
        "code": (
            "int count = 3;\n"
            "float ratio = 1.5;\n"
            'string label = "items";\n'
            "bool ready = sach;\n"
            "likho(count);\n"
            "likho(ratio);\n"
            "likho(label);\n"
            "likho(ready);"
        ),
    },
    {
        "id": "err_syntax",
        "title": "Broken syntax",
        "category": "invalid",
        "expected": "Parser 3+ errors",
        "code": ("int x = 5\n" "int y = 6\n" "int z = 7\n" "kaam f(a int) -> int { }"),
    },
    {
        "id": "err_semantic",
        "title": "Undeclared + type errors",
        "category": "invalid",
        "expected": "Semantic multiple errors",
        "code": (
            "int x = 5;\n"
            'y = x + "hello";\n'
            "int z = 10 / 0;\n"
            "likho(undefined_fn(1));"
        ),
    },
    {
        "id": "err_mixed",
        "title": "Mixed errors",
        "category": "invalid",
        "expected": "All engines error",
        "code": (
            "int x = 5\n"
            'int y = "text";\n'
            "kaam f(a: int) -> int { wapas a }\n"
            "likho(f());"
        ),
    },
]

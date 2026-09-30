// Built-in standard headers. Declarations here are real C so the parser type-checks
// calls; functions without bodies are bound to native implementations in stdlib.ts.

const base = `
#ifndef __CIT_BASE
#define __CIT_BASE
typedef unsigned long size_t;
typedef long ptrdiff_t;
typedef long ssize_t;
typedef int wchar_t;
#define NULL ((void *)0)
#endif
`;

const stddef = `${base}
#define offsetof(type, member) __builtin_offsetof(type, member)
typedef long max_align_t;
`;

const stdio = `${base}
typedef struct __cit_FILE FILE;
typedef long fpos_t;
#define EOF (-1)
#define BUFSIZ 8192
#define FILENAME_MAX 4096
#define SEEK_SET 0
#define SEEK_CUR 1
#define SEEK_END 2
#define stdin ((FILE *)0x10)
#define stdout ((FILE *)0x20)
#define stderr ((FILE *)0x30)
typedef __builtin_va_list __cit_va_list;
int printf(const char *format, ...);
int fprintf(FILE *stream, const char *format, ...);
int sprintf(char *str, const char *format, ...);
int snprintf(char *str, size_t size, const char *format, ...);
int vprintf(const char *format, __cit_va_list ap);
int vfprintf(FILE *stream, const char *format, __cit_va_list ap);
int vsprintf(char *str, const char *format, __cit_va_list ap);
int vsnprintf(char *str, size_t size, const char *format, __cit_va_list ap);
int scanf(const char *format, ...);
int fscanf(FILE *stream, const char *format, ...);
int sscanf(const char *str, const char *format, ...);
int puts(const char *s);
int fputs(const char *s, FILE *stream);
int putchar(int c);
int fputc(int c, FILE *stream);
int putc(int c, FILE *stream);
int getchar(void);
int fgetc(FILE *stream);
int getc(FILE *stream);
int ungetc(int c, FILE *stream);
char *fgets(char *s, int size, FILE *stream);
char *gets(char *s);
int fflush(FILE *stream);
void perror(const char *s);
FILE *fopen(const char *path, const char *mode);
int fclose(FILE *stream);
int feof(FILE *stream);
int ferror(FILE *stream);
void setbuf(FILE *stream, char *buf);
int setvbuf(FILE *stream, char *buf, int mode, size_t size);
#define _IOFBF 0
#define _IOLBF 1
#define _IONBF 2
`;

const stdlib = `${base}
#define EXIT_SUCCESS 0
#define EXIT_FAILURE 1
#define RAND_MAX 2147483647
typedef struct { int quot; int rem; } div_t;
void *malloc(size_t size);
void *calloc(size_t nmemb, size_t size);
void *realloc(void *ptr, size_t size);
void free(void *ptr);
void exit(int status);
void abort(void);
int atexit(void (*fn)(void));
int atoi(const char *s);
long atol(const char *s);
long long atoll(const char *s);
double atof(const char *s);
long strtol(const char *s, char **end, int base);
unsigned long strtoul(const char *s, char **end, int base);
long long strtoll(const char *s, char **end, int base);
unsigned long long strtoull(const char *s, char **end, int base);
double strtod(const char *s, char **end);
float strtof(const char *s, char **end);
int abs(int x);
long labs(long x);
long long llabs(long long x);
div_t div(int a, int b);
int rand(void);
void srand(unsigned int seed);
char *getenv(const char *name);
int system(const char *cmd);
void qsort(void *base, size_t nmemb, size_t size, int (*compar)(const void *, const void *));
void *bsearch(const void *key, const void *base, size_t nmemb, size_t size, int (*compar)(const void *, const void *));
`;

const string = `${base}
size_t strlen(const char *s);
size_t strnlen(const char *s, size_t maxlen);
char *strcpy(char *dest, const char *src);
char *strncpy(char *dest, const char *src, size_t n);
char *strcat(char *dest, const char *src);
char *strncat(char *dest, const char *src, size_t n);
int strcmp(const char *a, const char *b);
int strncmp(const char *a, const char *b, size_t n);
int strcasecmp(const char *a, const char *b);
int strncasecmp(const char *a, const char *b, size_t n);
char *strchr(const char *s, int c);
char *strrchr(const char *s, int c);
char *strstr(const char *haystack, const char *needle);
char *strpbrk(const char *s, const char *accept);
size_t strspn(const char *s, const char *accept);
size_t strcspn(const char *s, const char *reject);
char *strtok(char *s, const char *delim);
char *strdup(const char *s);
char *strndup(const char *s, size_t n);
char *strerror(int errnum);
char *strrev(char *s);
void *memcpy(void *dest, const void *src, size_t n);
void *memmove(void *dest, const void *src, size_t n);
void *memset(void *s, int c, size_t n);
int memcmp(const void *a, const void *b, size_t n);
void *memchr(const void *s, int c, size_t n);
`;

const mathFns1 = [
  'sqrt', 'cbrt', 'fabs', 'floor', 'ceil', 'round', 'trunc', 'rint', 'nearbyint', 'sin', 'cos', 'tan',
  'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'exp', 'exp2', 'expm1',
  'log', 'log10', 'log2', 'log1p',
];
const mathFns2 = ['pow', 'fmod', 'atan2', 'hypot', 'fmin', 'fmax', 'fdim', 'copysign', 'remainder'];

const math = `
#define M_PI 3.14159265358979323846
#define M_E 2.7182818284590452354
#define M_SQRT2 1.41421356237309504880
#define M_LN2 0.69314718055994530942
#define M_LN10 2.30258509299404568402
#define INFINITY __builtin_inff()
#define NAN __builtin_nanf("")
#define HUGE_VAL __builtin_huge_val()
#define isnan(x) __builtin_isnan(x)
#define isinf(x) __builtin_isinf(x)
#define isfinite(x) __builtin_isfinite(x)
#define signbit(x) __builtin_signbit(x)
${mathFns1.map((f) => `double ${f}(double x);\nfloat ${f}f(float x);`).join('\n')}
${mathFns2.map((f) => `double ${f}(double x, double y);\nfloat ${f}f(float x, float y);`).join('\n')}
double ldexp(double x, int e);
double frexp(double x, int *e);
double modf(double x, double *ip);
long lround(double x);
long lrint(double x);
`;

const ctypeFns = [
  'isalpha', 'isdigit', 'isalnum', 'isspace', 'isupper', 'islower', 'ispunct', 'isxdigit',
  'isprint', 'iscntrl', 'isgraph', 'isblank', 'toupper', 'tolower',
];
const ctype = ctypeFns.map((f) => `int ${f}(int c);`).join('\n');

const stdbool = `
#define bool _Bool
#define true 1
#define false 0
#define __bool_true_false_are_defined 1
`;

const stdint = `${base}
typedef signed char int8_t;
typedef short int16_t;
typedef int int32_t;
typedef long int64_t;
typedef unsigned char uint8_t;
typedef unsigned short uint16_t;
typedef unsigned int uint32_t;
typedef unsigned long uint64_t;
typedef signed char int_least8_t;
typedef short int_least16_t;
typedef int int_least32_t;
typedef long int_least64_t;
typedef unsigned char uint_least8_t;
typedef unsigned short uint_least16_t;
typedef unsigned int uint_least32_t;
typedef unsigned long uint_least64_t;
typedef signed char int_fast8_t;
typedef long int_fast16_t;
typedef long int_fast32_t;
typedef long int_fast64_t;
typedef unsigned char uint_fast8_t;
typedef unsigned long uint_fast16_t;
typedef unsigned long uint_fast32_t;
typedef unsigned long uint_fast64_t;
typedef long intptr_t;
typedef unsigned long uintptr_t;
typedef long intmax_t;
typedef unsigned long uintmax_t;
#define INT8_MIN (-128)
#define INT16_MIN (-32767-1)
#define INT32_MIN (-2147483647-1)
#define INT64_MIN (-9223372036854775807L-1)
#define INT8_MAX 127
#define INT16_MAX 32767
#define INT32_MAX 2147483647
#define INT64_MAX 9223372036854775807L
#define UINT8_MAX 255
#define UINT16_MAX 65535
#define UINT32_MAX 4294967295U
#define UINT64_MAX 18446744073709551615UL
#define INTPTR_MAX INT64_MAX
#define UINTPTR_MAX UINT64_MAX
#define SIZE_MAX UINT64_MAX
#define INTMAX_MAX INT64_MAX
#define UINTMAX_MAX UINT64_MAX
#define INT8_C(c) c
#define INT16_C(c) c
#define INT32_C(c) c
#define INT64_C(c) c ## L
#define UINT8_C(c) c
#define UINT16_C(c) c
#define UINT32_C(c) c ## U
#define UINT64_C(c) c ## UL
`;

const inttypes = `#include <stdint.h>
#define PRId8 "d"
#define PRId16 "d"
#define PRId32 "d"
#define PRId64 "ld"
#define PRIi32 "i"
#define PRIi64 "li"
#define PRIu8 "u"
#define PRIu16 "u"
#define PRIu32 "u"
#define PRIu64 "lu"
#define PRIx32 "x"
#define PRIx64 "lx"
#define PRIX32 "X"
#define PRIX64 "lX"
#define SCNd32 "d"
#define SCNd64 "ld"
#define SCNu32 "u"
#define SCNu64 "lu"
`;

const limits = `
#define CHAR_BIT 8
#define SCHAR_MIN (-128)
#define SCHAR_MAX 127
#define UCHAR_MAX 255
#define CHAR_MIN (-128)
#define CHAR_MAX 127
#define SHRT_MIN (-32768)
#define SHRT_MAX 32767
#define USHRT_MAX 65535
#define INT_MIN (-2147483647-1)
#define INT_MAX 2147483647
#define UINT_MAX 4294967295U
#define LONG_MIN (-9223372036854775807L-1)
#define LONG_MAX 9223372036854775807L
#define ULONG_MAX 18446744073709551615UL
#define LLONG_MIN (-9223372036854775807LL-1)
#define LLONG_MAX 9223372036854775807LL
#define ULLONG_MAX 18446744073709551615ULL
`;

const float = `
#define FLT_MAX 3.40282346638528859812e+38F
#define FLT_MIN 1.17549435082228750797e-38F
#define FLT_EPSILON 1.1920928955078125e-07F
#define FLT_DIG 6
#define DBL_MAX 1.79769313486231570815e+308
#define DBL_MIN 2.22507385850720138309e-308
#define DBL_EPSILON 2.22044604925031308085e-16
#define DBL_DIG 15
#define LDBL_MAX DBL_MAX
#define LDBL_MIN DBL_MIN
#define LDBL_EPSILON DBL_EPSILON
`;

const assert = `
void __assert_fail(const char *expr, const char *file, int line, const char *func);
#ifdef NDEBUG
#define assert(e) ((void)0)
#else
#define assert(e) ((e) ? (void)0 : __assert_fail(#e, __FILE__, __LINE__, __func__))
#endif
#define static_assert _Static_assert
`;

const time = `${base}
typedef long time_t;
typedef long clock_t;
#define CLOCKS_PER_SEC 1000000L
time_t time(time_t *t);
clock_t clock(void);
double difftime(time_t a, time_t b);
`;

const stdarg = `
typedef __builtin_va_list va_list;
#define va_start(ap, last) __builtin_va_start(ap, last)
#define va_arg(ap, type) __builtin_va_arg(ap, type)
#define va_end(ap) __builtin_va_end(ap)
#define va_copy(d, s) __builtin_va_copy(d, s)
`;

const errno = `
extern int errno;
#define EDOM 33
#define ERANGE 34
#define EINVAL 22
#define ENOMEM 12
`;

const iso646 = `
#define and &&
#define and_eq &=
#define bitand &
#define bitor |
#define compl ~
#define not !
#define not_eq !=
#define or ||
#define or_eq |=
#define xor ^
#define xor_eq ^=
`;

export const BUILTIN_HEADERS: Record<string, string> = {
  'stddef.h': stddef,
  'stdio.h': stdio,
  'stdlib.h': stdlib,
  'string.h': string,
  'strings.h': string,
  'math.h': math,
  'ctype.h': ctype,
  'stdbool.h': stdbool,
  'stdint.h': stdint,
  'inttypes.h': inttypes,
  'limits.h': limits,
  'float.h': float,
  'assert.h': assert,
  'time.h': time,
  'stdarg.h': stdarg,
  'errno.h': errno,
  'iso646.h': iso646,
  'stdnoreturn.h': '#define noreturn _Noreturn\n',
  'stdalign.h': '#define alignas _Alignas\n#define alignof _Alignof\n',
};

/** Headers students commonly try that we explicitly don't support, with a hint. */
export const UNSUPPORTED_HEADERS: Record<string, string> = {
  'conio.h': 'conio.h is a non-standard DOS/Turbo C header; use getchar() instead of getch()',
  'windows.h': 'windows.h is Windows-only and not available in the browser',
  'unistd.h': 'POSIX headers such as unistd.h are not available in the browser',
  'pthread.h': 'threads are not supported',
  'threads.h': 'threads are not supported',
  'signal.h': 'signals are not supported',
  'setjmp.h': 'setjmp/longjmp are not supported',
  'fcntl.h': 'file I/O is not supported',
  'sys/types.h': 'POSIX headers are not available in the browser',
  'sys/time.h': 'POSIX headers are not available in the browser',
  'complex.h': 'complex numbers are not supported',
  'wchar.h': 'wide characters are not supported',
  'locale.h': 'locales are not supported',
  'bits/stdc++.h': 'this is a C++ header; C-It runs C code',
  'iostream': 'this is a C++ header; C-It runs C code',
};

/** C source compiled together with every program (functions that call back into user code). */
export const PRELUDE = `
typedef unsigned long __cit_size_t;
static void __cit_swap_bytes(char *a, char *b, __cit_size_t n) {
  while (n--) { char t = *a; *a++ = *b; *b++ = t; }
}
void qsort(void *base, __cit_size_t nmemb, __cit_size_t size, int (*compar)(const void *, const void *)) {
  char *b = (char *)base;
  for (__cit_size_t i = 1; i < nmemb; i++) {
    __cit_size_t j = i;
    while (j > 0 && compar(b + (j - 1) * size, b + j * size) > 0) {
      __cit_swap_bytes(b + (j - 1) * size, b + j * size, size);
      j--;
    }
  }
}
void *bsearch(const void *key, const void *base, __cit_size_t nmemb, __cit_size_t size, int (*compar)(const void *, const void *)) {
  const char *b = (const char *)base;
  __cit_size_t lo = 0, hi = nmemb;
  while (lo < hi) {
    __cit_size_t mid = lo + (hi - lo) / 2;
    int c = compar(key, b + mid * size);
    if (c == 0) return (void *)(b + mid * size);
    if (c < 0) hi = mid; else lo = mid + 1;
  }
  return (void *)0;
}
`;

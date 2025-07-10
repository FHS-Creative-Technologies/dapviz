// See https://aka.ms/new-console-template for more information

int a;
int b = 44;
float c = 32.4f;
double d = 420.69;

string favouriteFood = "pickles";

int test(int a, int b)
{
    return a + b;
}

a = 43;

int e = test(a, b);
e = test((int)c, (int)d);

var mat = new Matrix()
{
    Row0 = new Vector
    {
        X = 0,
        Y = 1,
        Z = 0,
    },
    Row1 = new Vector
    {
        X = 1,
        Y = 0,
        Z = 0,
    },
    Row2 = new Vector
    {
        X = 0,
        Y = 0,
        Z = 1,
    },
};

var vec = new Vector
{
    X = 42,
    Y = 13,
    Z = 37,
};

var nested = new NestedClass
{
    mat = new Matrix()
    {
        Row0 = new Vector
        {
            X = 32,
            Y = 64,
            Z = 128,
        },

        Row1 = new Vector
        {
            X = 1,
            Y = 2,
            Z = 3,
        },

        Row2 = new Vector
        {
            X = 5,
            Y = 6,
            Z = 9,
        },
    },

    name = "mat",
    age = 33
};


var result = mat.Apply(vec);

for (int i = 0; i < 10; ++i)
{
    Console.Write(i);
}

Console.WriteLine($"Hello, World. I love eating {favouriteFood}");

class Vector
{
    public int X { get; init; }
    public int Y { get; init; }
    public int Z { get; init; }
}
class Matrix
{
    public required Vector Row0 { get; init; }
    public required Vector Row1 { get; init; }
    public required Vector Row2 { get; init; }

    public Vector Apply(Vector target)
    {
        return new Vector
        {
            X = Row0.X * target.X + Row0.Y * target.Y + Row0.Z * target.Z,
            Y = Row1.X * target.X + Row1.Y * target.Y + Row1.Z * target.Z,
            Z = Row2.X * target.X + Row2.Y * target.Y + Row2.Z * target.Z
        };
    }
}

class NestedClass
{
    public required Matrix mat { get; init; }
    public required string name { get; init; }
    public required int age { get; init; }

}

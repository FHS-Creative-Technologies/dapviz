// See https://aka.ms/new-console-template for more information

int a = 32;
int b = 44;
float c = 32.0f;
double d = 420.69;

var mat = new Matrix() {
    Row0 = new Vector{
        X = 0,
        Y = 0,
        Z = 0,
    },
    Row1 = new Vector{
        X = 0,
        Y = 0,
        Z = 0,
    },
    Row2 = new Vector{
        X = 0,
        Y = 0,
        Z = 0,
    },
};

for (int i = 0; i < 10; ++i) {
    Console.Write(i);
}

Console.WriteLine("Hello, World");

class Vector {
    public int X{get; init; }
    public int Y{get; init; }
    public int Z {get; init; }
}
class Matrix {
    public required Vector Row0 {get; init;}
    public required Vector Row1{get; init;}
    public required Vector Row2{get; init;}
}
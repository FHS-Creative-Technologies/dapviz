// See https://aka.ms/new-console-template for more information

public static class Program
{
    public static void Main(string[] args)
    {
        new VariablesTest().Run();
        new HeapObjectsTest().Run();
        new DataStructuresTest().Run();
    }
}

public class VariablesTest
{
    private int member_a = 12;
    private string member_string = "interesting";

    public void Run()
    {
        int stack_a;
        int stack_b = 44;
        float stack_c = 32.4f;
        double stack_d = 420.69;

        string @string = "hello";

        stack_a = -50;

        Console.WriteLine($"{stack_a}, {stack_b}, {stack_c}, {stack_d}, {@string}");
    }
}

public class HeapObjectsTest
{
    private class Vector3
    {
        public float X { get; init; }
        public float Y { get; init; }
        public float Z { get; init; }
    }

    private class VectorScaler
    {
        private readonly Vector3 vec;
        private readonly float multiplier;

        public VectorScaler(Vector3 vec, float multiplier)
        {
            this.vec = vec;
            this.multiplier = multiplier;
        }

        public Vector3 Apply()
        {
            return new Vector3()
            {
                X = vec.X * multiplier,
                Y = vec.Y * multiplier,
                Z = vec.Z * multiplier,
            };
        }
    }

    public void Run()
    {
        var vector = new Vector3()
        {
            X = 5,
            Y = 10,
            Z = 50,
        };

        var doubler = new VectorScaler(vector, 2.0f);
        var halver = new VectorScaler(vector, 0.5f);

        var undoer = new VectorScaler(doubler.Apply(), 0.5f);
        undoer.Apply();
        halver.Apply();
    }
}

public class DataStructuresTest
{
    public void Run()
    {
        RunList();
        RunDictionary();
        RunTree();
        RunStack();
        RunQueue();
        RunGraph();
    }

    private void RunList()
    {
        var list = new List<int> { 1, 2, 3, 4, 5 };
        list.Add(6);
        list.Remove(3);

        Console.WriteLine("List contents:");
        foreach (var item in list)
        {
            Console.WriteLine(item);
        }
    }

    private void RunDictionary()
    {
        var dictionary = new Dictionary<string, int>
        {
            { "one", 1 },
            { "two", 2 },
            { "three", 3 }
        };

        dictionary["four"] = 4;
        dictionary.Remove("two");

        Console.WriteLine("Dictionary contents:");
        foreach (var (key, value) in dictionary)
        {
            Console.WriteLine($"{key}: {value}");
        }
    }

    private void RunTree()
    {
        var tree = new SortedSet<int> { 5, 3, 8, 1, 4 };
        tree.Add(7);
        tree.Remove(3);

        Console.WriteLine("Tree contents:");
        foreach (var item in tree)
        {
            Console.WriteLine(item);
        }
    }

    private void RunStack()
    {
        var stack = new Stack<int>();
        stack.Push(1);
        stack.Push(2);
        stack.Push(3);
        Console.WriteLine("Stack contents:");
        while (stack.Count > 0)
        {
            Console.WriteLine(stack.Pop());
        }
    }

    private void RunQueue()
    {
        var queue = new Queue<int>();
        queue.Enqueue(1);
        queue.Enqueue(2);
        queue.Enqueue(3);
        Console.WriteLine("Queue contents:");
        while (queue.Count > 0)
        {
            Console.WriteLine(queue.Dequeue());
        }
    }

    private void RunGraph()
    {
        var graph = new Dictionary<int, List<int>>
        {
            { 1, new List<int> { 2, 3 } },
            { 2, new List<int> { 4 } },
            { 3, new List<int> { 4, 5 } },
            { 4, new List<int> { } },
            { 5, new List<int> { } }
        };

        Console.WriteLine("Graph adjacency list:");
        foreach (var node in graph)
        {
            Console.Write($"{node.Key}: ");
            foreach (var edge in node.Value)
            {
                Console.Write($"{edge} ");
            }
            Console.WriteLine();
        }
    }
}

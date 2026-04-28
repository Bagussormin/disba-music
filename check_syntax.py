import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    braces = 0
    parens = 0
    in_string = False
    string_char = ''
    in_comment = False
    
    i = 0
    while i < len(content):
        char = content[i]
        
        # Simple string handling
        if not in_comment:
            if char in ['"', "'", '`'] and (i == 0 or content[i-1] != '\\'):
                if not in_string:
                    in_string = True
                    string_char = char
                elif string_char == char:
                    in_string = False
            
        if not in_string:
            # Simple comment handling
            if char == '/' and i + 1 < len(content):
                if content[i+1] == '/':
                    in_comment = True
                    i += 1
                elif content[i+1] == '*':
                    # Multiline comment?
                    pass
            
            if in_comment and char == '\n':
                in_comment = False
                
            if not in_comment:
                if char == '{': braces += 1
                if char == '}': braces -= 1
                if char == '(': parens += 1
                if char == ')': parens -= 1
        
        i += 1
        
    print(f"Braces balance: {braces}")
    print(f"Parens balance: {parens}")

if __name__ == "__main__":
    check_balance(sys.argv[1])

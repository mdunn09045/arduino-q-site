import { Frame } from '../types';

/**
 * Generate Python code for Arduino App Lab (Qualcomm Dragonwing QRB2210 Linux core on Arduino UNO Q)
 */
export function generateUnoQPythonAppLabCode(
  title: string,
  frames: Frame[],
  delayMs: number = 350
): string {
  const sanitizedTitle = title.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'GHH_UnoQ_Matrix';
  const delaySec = (delayMs / 1000).toFixed(2);
  const fps = (1000 / delayMs).toFixed(1);
  const cols = frames[0]?.matrix[0]?.length || 13;

  let framesPy = 'animation_frames = [\n';
  frames.forEach((frame, idx) => {
    framesPy += `    # --- Frame ${idx + 1} of ${frames.length} ---\n    [\n`;
    for (let r = 0; r < 8; r++) {
      const row = frame.matrix[r] || Array(cols).fill(0);
      framesPy += `        [${row.map((v) => (v ? 1 : 0)).join(', ')}],  # Row ${r} (Y=${r})\n`;
    }
    framesPy += `    ],\n`;
  });
  framesPy += ']\n';

  return `"""
================================================================================
 ⚠️ TROUBLESHOOTING & MONITOR ONLY NOTICE:
 This Python script is for TROUBLESHOOTING and LOGIC TESTING in the terminal.
 IT WILL NOT LIGHT UP THE PHYSICAL LED MATRIX ON THE BOARD!
 It outputs animated character/emoji pixels (🟦/⬛) to your IDE serial monitor only.

 👉 TO LIGHT UP THE PHYSICAL BOARD:
 Switch to the C++ (.ino) tab and upload using Arduino IDE! The C++ code directly
 flashes the microcontroller memory to illuminate the physical blue LEDs.
================================================================================
 Grace Hopper Hacks 2026 - Arduino UNO Q Light Grid Studio
 Project: ${sanitizedTitle}
 Target Board: Arduino UNO Q (Dual-Brain Qualcomm Dragonwing + STM32)
 Environment: Arduino App Lab (Python on Linux MPU) / Arduino Lab for MicroPython
 Light Grid: ${cols} columns wide × 8 rows high (104 Blue LEDs total)
================================================================================

🎓 EDUCATIONAL CONCEPT BREAKDOWN (What this code is doing):

 1. 🧠 DUAL-BRAIN ARCHITECTURE:
    The Arduino UNO Q has TWO processors on a single board:
    • Qualcomm Dragonwing QRB2210: 64-bit Linux microprocessor running Python,
      WiFi, BLE, cameras, and AI edge pipelines.
    • STM32U585 Microcontroller: Ultra-low-power ARM Cortex-M33 running
      real-time I/O, PWM, and driving the 13×8 light grid.
    When this Python script runs in Arduino App Lab, the internal high-speed
    Inter-Processor Communication (IPC/RPC) bridge streams the frame data
    across the two chips to illuminate the physical blue LEDs!

 2. 💡 2D BINARY BITMAPS (1s and 0s):
    The \`animation_frames\` list below represents your animation as a 3D matrix:
    [frame][row][column].
    • 1 = LED ON  -> High state, current flows, LED illuminates blue!
    • 0 = LED OFF -> Low state, LED remains unlit.

 3. ⚡ MULTIPLEXING & PERSISTENCE OF VISION (POV):
    Instead of running 104 individual signal wires (which would require an enormous
    board), the matrix connects 8 row wires and 13 column wires (21 lines total).
    The hardware strobes each row thousands of times per second so you perceive
    a smooth, solid image!

 4. ⏱️ FRAME RATE & TIMING:
    FRAME_DELAY is set to ${delaySec}s (${delayMs}ms), giving an animation speed of
    approximately ${fps} Frames Per Second (FPS).

 5. 📺 MULTI-ENVIRONMENT RESILIENCE:
    Includes automatic hardware detection and a live Terminal ASCII/Emoji Matrix.
    If run outside the UNO Q Linux environment (e.g. in Arduino Lab for MicroPython
    or a desktop REPL), it renders live animated pixel frames directly in your IDE
    console so your screen is NEVER left blank!
================================================================================
"""

import sys
import time

# ------------------------------------------------------------------------------
# 🔌 HARDWARE DETECTION & DRIVER INITIALIZATION:
# Attempts to load the official Arduino UNO Q App Lab RPC matrix driver.
# If running in Arduino Lab for MicroPython or generic Python, gracefully activates
# the built-in Terminal Matrix Simulator so your project always animates visually!
# ------------------------------------------------------------------------------
matrix = None
hardware_connected = False

try:
    from arduino.applab import matrix as _m
    matrix = _m
    hardware_connected = True
except Exception:
    try:
        from arduino import matrix as _m
        matrix = _m
        hardware_connected = True
    except Exception:
        try:
            import matrix as _m
            matrix = _m
            hardware_connected = True
        except Exception:
            matrix = None
            hardware_connected = False

# ------------------------------------------------------------------------------
# ⏱️ ANIMATION TIMING:
# Delay between animation frames in seconds.
# Tweak this value to change speed:
# • Lower value (e.g. 0.15) = High-speed arcade action
# • Higher value (e.g. 0.60) = Ambient, relaxed breathing rhythm
# ------------------------------------------------------------------------------
FRAME_DELAY = ${delaySec}  # ${delayMs}ms per frame (~${fps} FPS)

# ------------------------------------------------------------------------------
# 🎨 ANIMATION DATA: ${frames.length} Frame(s) of ${cols}×8 Pixels
# Think of this list as a digital flipbook! Each nested list is one animation frame.
# Coordinates: [row 0 to 7][column 0 to ${cols - 1}]
# ------------------------------------------------------------------------------
${framesPy}

def flush_console():
    """Ensure printed text appears immediately in buffered IDE consoles."""
    try:
        if hasattr(sys, 'stdout') and hasattr(sys.stdout, 'flush'):
            sys.stdout.flush()
    except Exception:
        pass


def setup():
    """
    setup() runs ONCE when your application launches.
    Use it to initialize hardware drivers, print banner info, and verify setup.
    """
    print("\\n" + "=" * 65)
    print("🚀 Arduino UNO Q - Grace Hopper Hacks 2026 Light Grid")
    print(f"🎬 Loaded Project: ${sanitizedTitle}")
    print(f"⏱️  Frames: {len(animation_frames)} | Speed: {FRAME_DELAY}s per frame (~${fps} FPS)")
    
    global hardware_connected, matrix
    if hardware_connected and matrix is not None:
        try:
            if hasattr(matrix, 'begin'):
                matrix.begin()
            print("✨ Arduino UNO Q Hardware Matrix Initialized via RPC Bridge!")
        except Exception as e:
            print(f"⚠️ Note on hardware driver init: {e}")
            hardware_connected = False
    
    if not hardware_connected:
        print("💡 TROUBLESHOOTING NOTICE: Running in Terminal Console Simulation Mode.")
        print("   This Python script displays animated emoji/text frames in your IDE monitor.")
        print("   ⚠️  It will NOT light up the physical LED matrix on the board.")
        print("   👉 To light up the physical board: Use the C++ (.ino) tab in Arduino IDE!")
    print("=" * 65)
    flush_console()


def render_frame(frame, frame_idx):
    """
    Renders frame to physical hardware if connected,
    or draws animated pixel blocks in the IDE terminal so it is NEVER blank!
    """
    pushed_to_hardware = False
    if hardware_connected and matrix is not None:
        try:
            if hasattr(matrix, 'render'):
                matrix.render(frame)
                pushed_to_hardware = True
            elif hasattr(matrix, 'renderBitmap'):
                matrix.renderBitmap(frame, 8, len(frame[0]))
                pushed_to_hardware = True
            elif hasattr(matrix, 'show'):
                matrix.show(frame)
                pushed_to_hardware = True
        except Exception:
            pushed_to_hardware = False

    # If hardware is not connected or in console simulation mode,
    # render live emoji blocks directly to the Arduino Lab IDE console!
    if not pushed_to_hardware:
        print(f"\\n🎬 [Frame {frame_idx + 1}/{len(animation_frames)}]")
        for row in frame:
            print("  " + "".join("🟦" if px else "⬛" for px in row))
        flush_console()


def loop():
    """
    loop() runs continuously in a cycle.
    We iterate through our list of frames, render each one, and pause briefly.
    """
    for frame_index, frame in enumerate(animation_frames):
        render_frame(frame, frame_index)
        time.sleep(FRAME_DELAY)


# ------------------------------------------------------------------------------
# 🚀 DIRECT EXECUTION (Arduino Lab IDE / MicroPython / Standalone Python):
#
# IMPORTANT FIX FOR ARDUINO LAB IDE & MICROPYTHON REPL:
# When clicking "Run" in Arduino Lab IDE or MicroPython, scripts execute in
# an interactive REPL context where __name__ is NOT "__main__".
# If code was wrapped inside 'if __name__ == "__main__":', it would silently
# skip setup() and loop(), leaving the terminal and board completely blank!
#
# Running setup() and the loop directly below guarantees your code starts
# playing immediately the moment you click "Run"!
# ------------------------------------------------------------------------------
setup()
try:
    while True:
        loop()
except KeyboardInterrupt:
    if hardware_connected and matrix is not None and hasattr(matrix, 'clear'):
        try:
            matrix.clear()
        except Exception:
            pass
    print("\\n🛑 Light Grid animation stopped cleanly. Great job, hacker!")
`;
}

/**
 * Generate Arduino UNO Q C++ Sketch (STM32U585 core)
 */
export function generateArduinoMatrixCode(
  title: string,
  frames: Frame[],
  delayMs: number = 300,
  loopAnimation: boolean = true
): string {
  const sanitizedTitle = title.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'GHH_UnoQ_Pixel_Matrix';
  const frameCount = frames.length;
  const cols = frames[0]?.matrix[0]?.length || 13;
  const fps = (1000 / delayMs).toFixed(1);

  let framesArrayCode = `// -----------------------------------------------------------------------------\n`;
  framesArrayCode += `// 🎨 ANIMATION BITMAPS: ${frameCount} frame(s), 8 rows x ${cols} columns\n`;
  framesArrayCode += `// Declared as non-const uint8_t for Arduino Zephyr UNO Q driver compatibility\n`;
  framesArrayCode += `// (Avoids "invalid conversion from const uint8_t* to uint8_t*" in Zephyr)\n`;
  framesArrayCode += `// -----------------------------------------------------------------------------\n`;
  framesArrayCode += `uint8_t frames[${frameCount}][8][${cols}] = {\n`;

  frames.forEach((frame, idx) => {
    framesArrayCode += `  // --- Frame ${idx + 1} of ${frameCount} ---\n  {\n`;
    for (let r = 0; r < 8; r++) {
      const row = frame.matrix[r] || Array(cols).fill(0);
      const rowStr = row.map((v) => (v ? '1' : '0')).join(', ');
      framesArrayCode += `    { ${rowStr} }${r < 7 ? ',' : ''}  // Row ${r}\n`;
    }
    framesArrayCode += `  }${idx < frameCount - 1 ? ',' : ''}\n`;
  });
  framesArrayCode += `};\n`;

  return `/*
 * ==============================================================================
 * Grace Hopper Hacks 2026 - Arduino UNO Q Light Grid Studio
 * Project: ${sanitizedTitle}
 * Board: Arduino UNO Q (STM32U585 Microcontroller Core - Zephyr)
 * Language: C++ / Arduino Sketch (.ino) - DEFAULT HARDWARE CODE
 * Light Grid: ${cols} columns wide × 8 rows high (104 Blue LEDs)
 * ==============================================================================
 *
 * ⚡ PRIMARY PHYSICAL BOARD CODE (.ino):
 * Upload this code via Arduino IDE to light up the PHYSICAL LED matrix!
 * Unlike Python (which is for serial console troubleshooting only), this C++
 * code flashes directly into microcontroller memory to drive the physical LEDs.
 *
 * 🎓 EMBEDDED ENGINEERING 101 (What this code teaches you):
 *
 * 1. 💾 WHY 'uint8_t' INSTEAD OF 'int'? (Memory Optimization)
 *    In desktop C++, integers are typically 32-bit (4 bytes each).
 *    On embedded microcontrollers like the STM32, RAM is limited and precious!
 *    • 'uint8_t' stands for "Unsigned Integer 8-Bit" (values 0 to 255).
 *    • It uses exactly 1 byte per value instead of 4 bytes.
 *    • For our ${frameCount} frame(s) (${frameCount * 8 * cols} total pixel values),
 *      using uint8_t saves 75% of memory compared to regular int!
 *
 * 2. 🧊 3D ARRAY GEOMETRY: frames[TOTAL_FRAMES][ROWS][COLS]
 *    This 3D array organizes our animation into three dimensions:
 *    • Dimension 1 [i]: Which animation frame (0 to ${frameCount - 1})
 *    • Dimension 2 [r]: Which row on the grid (0 to 7, top to bottom)
 *    • Dimension 3 [c]: Which column in that row (0 to ${cols - 1}, left to right)
 *
 * 3. ⚡ MATRIX MULTIPLEXING (Persistence of Vision):
 *    All 104 LEDs are wired across 8 rows and 13 columns.
 *    The \`Arduino_LED_Matrix\` library rapidly strobes each active row at high
 *    frequencies. Because human eyes retain light for ~1/16th of a second,
 *    all 104 LEDs appear lit simultaneously without any visible flicker!
 *
 * 4. 🔄 THE ARDUINO EXECUTION MODEL:
 *    • \`setup()\` runs exactly ONCE when the board powers up or is reset.
 *    • \`loop()\` repeats continuously forever while power is supplied.
 * ==============================================================================
 */

// ==============================================================================
// 📦 ZERO EXTERNAL LIBRARIES REQUIRED:
// You DO NOT need to install ANY libraries from the Arduino Library Manager!
// (If you saw "Library install failed: ArxTypeTraits...", you can ignore it!)
// "Arduino_LED_Matrix.h" is BUILT DIRECTLY into the official board core
// (Arduino Renesas UNO R4 Boards / Arduino UNO Q Zephyr). Select your board & click Upload!
// ==============================================================================
#include "Arduino_LED_Matrix.h"

// Instantiate the matrix hardware object
ArduinoLEDMatrix matrix;

// -----------------------------------------------------------------------------
// ⏱️ ANIMATION CONSTANTS & TIMING
// -----------------------------------------------------------------------------
const int FRAME_DELAY  = ${delayMs};   // Duration each frame stays lit (in ms). Speed: ~${fps} FPS
const int TOTAL_FRAMES = ${frameCount};  // Number of frames in our animation
const int COLS         = ${cols};        // Grid width (13 columns)
const int ROWS         = 8;         // Grid height (8 rows)

${framesArrayCode}

void setup() {
  // Initialize USB Serial communication for diagnostics and live logs.
  // 115200 baud is the recommended high-speed transfer rate for the Arduino UNO Q.
  Serial.begin(115200);
  
  Serial.println("====================================================");
  Serial.println("🚀 Grace Hopper Hacks 2026 - Arduino UNO Q Studio");
  Serial.println("🎬 Project: ${sanitizedTitle}");
  Serial.println("⏱️  Frame Delay: ${delayMs}ms (~${fps} FPS)");
  Serial.println("💡 Initializing integrated 13x8 Light Grid...");
  Serial.println("====================================================");
  
  // matrix.begin() initializes the display controller, powers the LED matrix circuitry,
  // and starts the background refresh timer interrupt on the STM32.
  matrix.begin();
  
  Serial.println("✨ Hardware online! Playing animation loop...");
}

void loop() {
  // Cycle sequentially through each frame in our animation array
  for (int i = 0; i < TOTAL_FRAMES; i++) {
    // matrix.renderBitmap() pushes the 8x${cols} binary bitmap directly to the
    // matrix driver registers, illuminating the corresponding blue LEDs.
    matrix.renderBitmap(frames[i], ROWS, COLS);
    
    // Pause for FRAME_DELAY milliseconds before transitioning to the next frame
    delay(FRAME_DELAY);
  }
${!loopAnimation ? '  // If single-play mode is chosen, halt here instead of repeating:\n  while(true) {\n    delay(1000);  // Idle loop to keep the board running quietly\n  }\n' : ''}}
`;
}

/**
 * Generate Python Morse Code Flasher for Arduino App Lab
 */
export function generateUnoQPythonMorseCode(name: string, morseString: string): string {
  const cleanName = name.replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase().trim() || 'GRACE';

  return `"""
================================================================================
 Grace Hopper Hacks 2026 - Arduino UNO Q Morse Code Studio
 Message: "${cleanName}"
 Morse Sequence: "${morseString}"
 Environment: Arduino App Lab (Python on Qualcomm Dragonwing Linux MPU)
================================================================================

🎓 MORSE CODE TIMING RULES (International Telecommunication Union Standard):
 • 1 Unit = Duration of one DOT (dit) = 0.15s (150ms)
 • 3 Units = Duration of one DASH (dah) = 0.45s (450ms)
 • 1 Unit = Space between elements within the same letter = 0.15s
 • 3 Units = Space between letters = 0.45s
 • 7 Units = Space between words = 1.05s

This script teaches you how telecommunication protocols map time intervals
to digital states (HIGH/LOW) to transmit human language across physical media!
================================================================================
"""

import sys
import time

# Hardware auto-detection
matrix = None
led = None
hardware_connected = False

try:
    from arduino.applab import matrix as _m, led as _l
    matrix = _m
    led = _l
    hardware_connected = True
except Exception:
    pass

MESSAGE = "${cleanName}"

# Lookup dictionary mapping alphanumeric characters to International Morse Code
MORSE_MAP = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
    '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
    '8': '---..', '9': '----.', ' ': '/'
}

# Standard time constants (in seconds)
DOT_TIME = 0.15   # 150ms dot duration (1 unit)
DASH_TIME = 0.45  # 450ms dash duration (3 units)
ELEM_GAP = 0.15   # Gap between dots/dashes in the same character (1 unit)
CHAR_GAP = 0.45   # Gap between individual letters (3 units)
WORD_GAP = 1.05   # Gap between words (7 units)

def flush_console():
    try:
        if hasattr(sys, 'stdout') and hasattr(sys.stdout, 'flush'):
            sys.stdout.flush()
    except Exception:
        pass

def flash_pulse(duration, symbol):
    """
    Pulses diagnostic LED, 13x8 matrix, and terminal console for 'duration' seconds.
    """
    if hardware_connected and led is not None and hasattr(led, 'on'):
        try:
            led.on()
        except Exception:
            pass
    if hardware_connected and matrix is not None and hasattr(matrix, 'fill'):
        try:
            matrix.fill(1)
        except Exception:
            pass

    # Terminal visual output
    dot_dash = "● (DOT)" if symbol == '.' else "━ (DASH)"
    print(f"  {dot_dash} [{'#' * int(duration * 20)}]")
    flush_console()
    time.sleep(duration)
    
    if hardware_connected and led is not None and hasattr(led, 'off'):
        try:
            led.off()
        except Exception:
            pass
    if hardware_connected and matrix is not None and hasattr(matrix, 'clear'):
        try:
            matrix.clear()
        except Exception:
            pass
    time.sleep(ELEM_GAP)

def play_morse(text):
    """
    Iterates through each character, converts to dots and dashes,
    and flashes the light grid accordingly.
    """
    print(f"\\n📡 Transmitting Morse for: '{text}' ({morseString})")
    flush_console()
    for char in text.upper():
        if char == ' ':
            print("  [SPACE]")
            flush_console()
            time.sleep(WORD_GAP)
            continue
        code = MORSE_MAP.get(char, '')
        print(f" Letter '{char}' -> {code}")
        flush_console()
        for sym in code:
            flash_pulse(DOT_TIME if sym == '.' else DASH_TIME, sym)
        time.sleep(CHAR_GAP)

# Direct execution for Arduino Lab IDE / MicroPython / Standalone Python
print("\\n" + "=" * 55)
print("🚀 Arduino UNO Q - Morse Code Transmitter Online!")
print(f"🔤 Message: {MESSAGE} ({morseString})")
print("=" * 55)
flush_console()

if hardware_connected and matrix is not None and hasattr(matrix, 'begin'):
    try:
        matrix.begin()
    except Exception:
        pass

try:
    while True:
        play_morse(MESSAGE)
        time.sleep(2.0)  # Pause between full message repeats
except KeyboardInterrupt:
    print("\\n🛑 Morse transmission stopped.")
`;
}

/**
 * Generate Arduino UNO Q C++ Morse Code flasher
 */
export function generateArduinoMorseCode(name: string, morseString: string): string {
  const cleanName = name.replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase().trim() || 'GRACE';

  return `/*
 * ==============================================================================
 * Grace Hopper Hacks 2026 - Arduino UNO Q Morse Code Name Studio
 * Message: "${cleanName}"
 * Morse Sequence: "${morseString}"
 * Target Board: Arduino UNO Q (STM32U585 Core & 13x8 Light Grid)
 * ==============================================================================
 *
 * 🎓 TELECOMMUNICATION & TIMING PRINCIPLES:
 * This sketch demonstrates precise embedded time slicing using standard
 * International Morse Code ratios (Paris Standard):
 * • 1 Time Unit  = DOT_TIME = 150ms
 * • 3 Time Units = DASH_TIME = 450ms
 * • 1 Time Unit  = Element separation gap
 * • 3 Time Units = Letter separation gap
 * • 7 Time Units = Word separation gap
 *
 * Instead of simple blinks, this code draws a mini 3x2 dot icon on the matrix
 * for dots, and a wide 9x2 horizontal bar for dashes!
 * ==============================================================================
 */

// ==============================================================================
// 📦 ZERO EXTERNAL LIBRARIES REQUIRED:
// You DO NOT need to install ANY libraries from the Library Manager!
// (Ignore any ArxTypeTraits warnings/prompts)
// "Arduino_LED_Matrix.h" is BUILT DIRECTLY into the official board core.
// ==============================================================================
#include "Arduino_LED_Matrix.h"

ArduinoLEDMatrix matrix;
const char myMessage[] = "${cleanName}";

// Hardware timing constants (milliseconds)
const int DOT_TIME  = 150;           // Duration of dot (dit)
const int DASH_TIME = DOT_TIME * 3;  // Duration of dash (dah) = 450ms
const int ELEM_GAP  = DOT_TIME;      // Gap between dots/dashes in a letter = 150ms
const int CHAR_GAP  = DOT_TIME * 3;  // Gap between letters = 450ms
const int WORD_GAP  = DOT_TIME * 7;  // Gap between words = 1050ms

// 13x8 Dot frame (non-const for Zephyr Arduino_LED_Matrix loadPixels compatibility)
uint8_t dotFrame[8][13] = {
  {0,0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,1,1,1,0,0,0,0,0},
  {0,0,0,0,0,1,1,1,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0,0}
};

// 13x8 Dash frame (non-const for Zephyr Arduino_LED_Matrix loadPixels compatibility)
uint8_t dashFrame[8][13] = {
  {0,0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,1,1,1,1,1,1,1,1,1,0,0},
  {0,0,1,1,1,1,1,1,1,1,1,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0,0}
};

uint8_t emptyFrame[8][13] = {0};

void playDot() {
  digitalWrite(LED_BUILTIN, HIGH);
  matrix.renderBitmap(dotFrame, 8, 13);
  delay(DOT_TIME);
  
  digitalWrite(LED_BUILTIN, LOW);
  matrix.renderBitmap(emptyFrame, 8, 13);
  delay(ELEM_GAP);
}

void playDash() {
  digitalWrite(LED_BUILTIN, HIGH);
  matrix.renderBitmap(dashFrame, 8, 13);
  delay(DASH_TIME);
  
  digitalWrite(LED_BUILTIN, LOW);
  matrix.renderBitmap(emptyFrame, 8, 13);
  delay(ELEM_GAP);
}

void flashLetter(char c) {
  switch (toupper(c)) {
    case 'A': playDot(); playDash(); break;
    case 'B': playDash(); playDot(); playDot(); playDot(); break;
    case 'C': playDash(); playDot(); playDash(); playDot(); break;
    case 'D': playDash(); playDot(); playDot(); break;
    case 'E': playDot(); break;
    case 'F': playDot(); playDot(); playDash(); playDot(); break;
    case 'G': playDash(); playDash(); playDot(); break;
    case 'H': playDot(); playDot(); playDot(); playDot(); break;
    case 'I': playDot(); playDot(); break;
    case 'J': playDot(); playDash(); playDash(); playDash(); break;
    case 'K': playDash(); playDot(); playDash(); break;
    case 'L': playDot(); playDash(); playDot(); playDot(); break;
    case 'M': playDash(); playDash(); break;
    case 'N': playDash(); playDot(); break;
    case 'O': playDash(); playDash(); playDash(); break;
    case 'P': playDot(); playDash(); playDash(); playDot(); break;
    case 'Q': playDash(); playDash(); playDot(); playDash(); break;
    case 'R': playDot(); playDash(); playDot(); break;
    case 'S': playDot(); playDot(); playDot(); break;
    case 'T': playDash(); break;
    case 'U': playDot(); playDot(); playDash(); break;
    case 'V': playDot(); playDot(); playDot(); playDash(); break;
    case 'W': playDot(); playDash(); playDash(); break;
    case 'X': playDash(); playDot(); playDot(); playDash(); break;
    case 'Y': playDash(); playDot(); playDash(); playDash(); break;
    case 'Z': playDash(); playDash(); playDot(); playDot(); break;
    case '1': playDot(); playDash(); playDash(); playDash(); playDash(); break;
    case '2': playDot(); playDot(); playDash(); playDash(); playDash(); break;
    case '3': playDot(); playDot(); playDot(); playDash(); playDash(); break;
    case '4': playDot(); playDot(); playDot(); playDot(); playDash(); break;
    case '5': playDot(); playDot(); playDot(); playDot(); playDot(); break;
    case '6': playDash(); playDot(); playDot(); playDot(); playDot(); break;
    case '7': playDash(); playDash(); playDot(); playDot(); playDot(); break;
    case '8': playDash(); playDash(); playDash(); playDot(); playDot(); break;
    case '9': playDash(); playDash(); playDash(); playDash(); playDot(); break;
    case '0': playDash(); playDash(); playDash(); playDash(); playDash(); break;
    case ' ': delay(WORD_GAP); return;
    default: break;
  }
  delay(CHAR_GAP);
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  matrix.begin();
  Serial.begin(115200);
  Serial.print("Arduino UNO Q - Transmitting Morse for: ");
  Serial.println(myMessage);
}

void loop() {
  for (int i = 0; myMessage[i] != '\\0'; i++) {
    flashLetter(myMessage[i]);
  }
  delay(WORD_GAP * 2);
}
`;
}

/**
 * Trigger browser download for .py or .ino file
 */
export function downloadSketch(filename: string, code: string) {
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

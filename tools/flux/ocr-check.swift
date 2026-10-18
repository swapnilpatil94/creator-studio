// Text-in-picture detector (macOS Vision). AI painters draw gibberish lettering into pictures; on sacred art that must never ship. Prints JSON: {"chars": N, "strings": [...]}.
// Build: swiftc -O tools/flux/ocr-check.swift -o tools/flux/bin/ocr-check      usage: ocr-check <image>
import Foundation; import Vision; import AppKit
let path = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ""
guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print("{\"error\":\"cannot read image\"}"); exit(1) }
let req = VNRecognizeTextRequest(); req.recognitionLevel = .accurate; req.usesLanguageCorrection = false
try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
var strings: [String] = []; var chars = 0
for o in req.results ?? [] { if let c = o.topCandidates(1).first, c.confidence >= 0.3 { let letters = c.string.filter { $0.isLetter || $0.isNumber }.count; if letters >= 2 { strings.append(c.string); chars += letters } } }
let data = try! JSONSerialization.data(withJSONObject: ["chars": chars, "strings": strings]); print(String(data: data, encoding: .utf8)!)

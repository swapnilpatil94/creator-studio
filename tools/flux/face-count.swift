// Face detector (macOS Vision) for thumbnail art: how many faces, how large, where. Prints {"count":N,"faces":[{"x":..,"y":..,"w":..,"h":..}]} with boxes as fractions of the image, origin top-left.
// Used to reject paintings with duplicated characters (more faces than the story has), to make sure the main face is large enough to recognise, and to keep headlines off faces.
// Build: swiftc -O tools/flux/face-count.swift -o tools/flux/bin/face-count      usage: face-count <image>
import Foundation; import Vision; import AppKit
let path = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ""
guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print("{\"error\":\"cannot read image\"}"); exit(1) }
let req = VNDetectFaceRectanglesRequest(); try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
let faces = (req.results ?? []).map { r -> [String: Double] in let b = r.boundingBox; return ["x": Double(b.minX), "y": Double(1 - b.maxY), "w": Double(b.width), "h": Double(b.height)] }
let data = try! JSONSerialization.data(withJSONObject: ["count": faces.count, "faces": faces]); print(String(data: data, encoding: .utf8)!)

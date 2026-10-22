// Anatomy probe (macOS Vision, on-device): faces, bodies and hands found in a picture. Prints {"faces":N,"bodies":N,"hands":N,"minFace":h,"faceBoxes":[...]}
// A generated figure group with more hands than two per person, or more faces than the shot's figure budget, is the "extra hands / melted crowd" failure.
// Build: swiftc -O tools/flux/anatomy.swift -o tools/flux/bin/anatomy      usage: anatomy <image>
import Foundation; import Vision; import AppKit
let path = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ""
guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print("{\"error\":\"cannot read image\"}"); exit(1) }
let face = VNDetectFaceRectanglesRequest(), body = VNDetectHumanBodyPoseRequest(), hand = VNDetectHumanHandPoseRequest(); hand.maximumHandCount = 12
try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([face, body, hand])
let fb = (face.results ?? []).map { Double($0.boundingBox.height) }
let out: [String: Any] = ["faces": fb.count, "bodies": (body.results ?? []).count, "hands": (hand.results ?? []).count, "minFace": fb.min() ?? 0, "maxFace": fb.max() ?? 0]
print(String(data: try! JSONSerialization.data(withJSONObject: out), encoding: .utf8)!)

import Foundation
import Vision
// prints {"labels":[{"id":..,"p":..}]} for an image: macOS on-device image classification (no model download)
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let req = VNClassifyImageRequest()
let h = VNImageRequestHandler(url: url, options: [:])
try? h.perform([req])
let obs = (req.results ?? []).filter { $0.confidence > 0.05 }.prefix(60)
let arr = obs.map { "{\"id\":\"\($0.identifier)\",\"p\":\(String(format: "%.3f", $0.confidence))}" }
print("{\"labels\":[" + arr.joined(separator: ",") + "]}")
